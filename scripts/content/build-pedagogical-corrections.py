"""Build reviewed data-only corrections against a fresh dev snapshot.

No database writes: apply-course-learning.py performs the guarded transaction.
Original sources, media, identities and student records are never rewritten.
"""
import argparse
import copy
import json
from pathlib import Path

COURSE_ID = 'cmjnr0g5x0001jp04fsw2fejs'
UNIT_ONE = 'cmk4otvgp0001w1p4ijdkv6i2'
MISSING = {'$missing': True}
DELETE = {'$delete': True}
PROTECTED = {'originalSource', 'originalIDs', 'originalIds', 'sourceText',
             'nativeParagraphs', 'sourceUrl', 'sourceDigest', 'sourceSlides',
             'url', 'transcript', 'mediaDigest', 'sourceAudioSha256',
             'scene', 'sceneSide', 'assetPath', 'learningRevision'}


def protected_values(value, path=()):
    found = {}
    if isinstance(value, dict):
        for key, item in value.items():
            if key in PROTECTED:
                found[path + (key,)] = item
            else:
                found.update(protected_values(item, path + (key,)))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            found.update(protected_values(item, path + (index,)))
    return found


def apply_changes(row, changes):
    updated = copy.deepcopy(row)
    if row['data'].get('type') == 'teacher_notes':
        raise ValueError('protected teacher archive')
    seen = []
    for change in changes:
        path = change.get('path')
        if not isinstance(path, list) or not path or any(key in PROTECTED for key in path if isinstance(key, str)):
            raise ValueError('protected or invalid path')
        if any(path[:len(old)] == old or old[:len(path)] == path for old in seen):
            raise ValueError('Overlapping paths require a single reviewed operation')
        seen.append(path)
        current = updated['data']
        for key in path[:-1]:
            try:
                current = current[key]
            except (KeyError, IndexError, TypeError) as error:
                raise ValueError('Missing parent path') from error
        key = path[-1]
        actual = current.get(key, MISSING) if isinstance(current, dict) else current[key]
        if actual != change['before']:
            raise ValueError(f'Reviewed before value changed: {row["id"]} {path}')
        after = change['after']
        if after == DELETE:
            if actual == MISSING or not isinstance(current, dict):
                raise ValueError('Cannot delete missing or indexed field')
            del current[key]
        else:
            if actual == after:
                raise ValueError('Empty correction')
            current[key] = copy.deepcopy(after)
    if protected_values(row['data']) != protected_values(updated['data']):
        raise ValueError('protected media/source changed through parent object')
    if row['data'].get('type') in {'audio', 'image', 'video'} and row['data']['type'] != updated['data'].get('type'):
        raise ValueError('protected media modality')
    return updated


def build_plans(snapshot, patches):
    if snapshot.get('database') != 'lingowow_dev' or snapshot.get('courseId') != COURSE_ID:
        raise ValueError('Isolated dev snapshot required')
    lessons = {lesson['id']: lesson for lesson in snapshot['lessons']}
    targets = {}
    seen = set()
    for patch in patches:
        lesson_id, row_id = patch['lessonId'], patch['rowId']
        if lesson_id == UNIT_ONE or lesson_id not in lessons:
            raise ValueError('Unexpected lesson; Unit1 has its own reviewed migration')
        if row_id in seen or not patch.get('reason') or not patch.get('changes'):
            raise ValueError('Duplicate or unexplained correction')
        seen.add(row_id)
        if lesson_id not in targets:
            original = lessons[lesson_id]['rows']
            targets[lesson_id] = {'courseId': COURSE_ID, 'lessonId': lesson_id,
                                  'publishable': True, 'blockers': [],
                                  'previousRows': copy.deepcopy(original),
                                  'nextRows': copy.deepcopy(original)}
        plan = targets[lesson_id]
        matching = [i for i, row in enumerate(plan['nextRows']) if row['id'] == row_id]
        if len(matching) != 1:
            raise ValueError('Row is not in target lesson')
        i = matching[0]
        plan['nextRows'][i] = apply_changes(plan['nextRows'][i], patch['changes'])
    return list(targets.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--patch', type=Path, action='append', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8-sig'))
    patches = []
    for file in args.patch:
        value = json.loads(file.read_text(encoding='utf-8-sig'))
        if value.get('schemaVersion') != 1:
            raise ValueError('Unsupported review schema')
        patches.extend(value['patches'])
    plans = build_plans(snapshot, patches)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'schemaVersion': 1, 'plans': plans}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Reviewed corrections: {len(plans)} lessons, {len(patches)} rows. No database writes.')


if __name__ == '__main__':
    main()
