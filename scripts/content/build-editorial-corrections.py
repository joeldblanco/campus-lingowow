"""Build an audited, dev-only correction plan with complete finding coverage."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('guarded_corrections', Path(__file__).with_name('build-pedagogical-corrections.py'))
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


def build(snapshot, report, documents):
    confirmed = {item['id'] for item in report['findings'] if item['classification'] == 'confirmed'}
    coverage, patches = {}, []
    for document in documents:
        if document.get('schemaVersion') != 1:
            raise ValueError('Unsupported correction schema')
        patches.extend(document['patches'])
        for item in document['coverage']:
            key = item['findingId']
            if key in coverage or key not in confirmed or item['status'] != 'patched':
                raise ValueError('Duplicate, unreviewed or unresolved finding')
            coverage[key] = item
    if coverage.keys() != confirmed:
        raise ValueError('Incomplete confirmed finding coverage')
    changed_ids = {patch['rowId'] for patch in patches}
    if any(not item.get('rowIds') or not set(item['rowIds']) <= changed_ids for item in coverage.values()):
        raise ValueError('Finding lacks an implemented correction')
    plans = guard.build_plans(snapshot, patches)
    expected = copy.deepcopy(snapshot)
    planned = {plan['lessonId']: plan['nextRows'] for plan in plans}
    for lesson in expected['lessons']:
        if lesson['id'] in planned:
            lesson['rows'] = planned[lesson['id']]
    return {'schemaVersion': 1, 'plans': plans}, expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--patch', type=Path, action='append', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--expected', type=Path, required=True)
    args = parser.parse_args()
    report = json.loads(args.report.read_text(encoding='utf-8-sig'))
    if hashlib.sha256(args.snapshot.read_bytes()).hexdigest() != report['snapshotSha256'].lower():
        raise ValueError('Fresh dev snapshot differs from audited baseline')
    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8-sig'))
    docs = [json.loads(path.read_text(encoding='utf-8-sig')) for path in args.patch]
    plan, expected = build(snapshot, report, docs)
    for path, value in [(args.output, plan), (args.expected, expected)]:
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"All confirmed findings covered; {len(plan['plans'])} lessons, {sum(len(d['patches']) for d in docs)} changed rows. No database writes.")


if __name__ == '__main__':
    main()
