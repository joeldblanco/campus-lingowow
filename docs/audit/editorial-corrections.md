# Audited editorial corrections — dev only

The post-correction curriculum still contained wrong or ambiguous answer keys,
malformed vocabulary pairs, misleading grammar models and duplicated learner text.
The reviewed patches address 129 confirmed findings in 116 rows across 49 lessons.
The 26 editorial preferences are excluded. Unit 1 has no confirmed findings in
this review and is preserved unchanged.

`editorial-reviewed-findings.json` records the audited baseline and finding IDs.
The three `editorial-patches-*.json` files contain exact before/after paths and
coverage. Paths are relative to `contents.data`, not the enclosing database row.
Original sources, scene assets, media URLs, identities, order and student history
remain protected. Accidental URL/headline vocabulary rows and a duplicate essay
are retained as hidden teacher notes rather than deleted.

`build-editorial-corrections.py` checks baseline SHA-256, complete confirmed finding
coverage and the existing protected-path correction engine. It produces a plan
and an expected snapshot without database writes. `apply-course-learning.py`
then runs a guarded dev-only transaction, first with rollback, then with `--apply`.
Exact-source CAS and student-history checks must pass; no forced overwrite is allowed.

The source importer now accepts vocabulary pairs only from complete explicitly
separated lines; URLs and hyphenated prose are not definitions, and curly
apostrophes are retained. This does not certify arbitrary pairs semantically:
source tables and word banks still require reviewed pedagogy.

Regression tests cover extraction, release coverage, source preservation, the
parents-origin question, the dialogue ownership key, contextual modal likelihood
and the meaning of “a shot in the dark”. Visual and deployment acceptance are
recorded separately; code changes alone do not publish the reviewed content.
