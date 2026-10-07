# Unit 1 learning-content application

`scripts/content/apply-unit1-learning.py` applies a reviewed JSON plan to the
isolated `lingowow_dev` database. The plan itself is the review artifact: its
`previousRows` array archives the 17 current rows and its `nextRows` array
contains the 22 reviewed rows.

The five allowed additions are exactly:

- `unit1-introductions-v1`
- `unit1-contact-v1`
- `unit1-questions-v1`
- `unit1-sentences-v1`
- `unit1-conversation-v1`

Every addition must be top-level (`parentId: null`) `RICH_TEXT` content. An
existing row keeps its ID, lesson, parent, content type, and title. The
application may change only its `data` and `order`; SQL assigns `updatedAt`.
Deletions, unexpected IDs, changed immutable fields, or either of the two
approved audio `data.url` values are rejected before a commit can occur.

The script validates the plan locally, starts a `SERIALIZABLE` transaction,
locks the current lesson inventory, and performs a compare-and-swap on each
archived existing row's ID, order, and data. It checks the exact 17-row
pre-update and 22-row post-update inventories. Baseline and post-update MD5
digests cover content identity, every `user_contents` row, and every
`block_responses` row for the lesson; response IDs and history are therefore
preserved without a zero-response shortcut.

By default the generated transaction ends in `ROLLBACK` as a rehearsal. Use
`--apply` only after the reviewed plan has passed the local checks and the
visual/content gate:

```powershell
python scripts/content/apply-unit1-learning.py path\to\unit1-learning-plan.json
python scripts/content/apply-unit1-learning.py path\to\unit1-learning-plan.json --apply
```

The command sends a guarded `bash -s` script over SSH. The remote checks load
`/root/lingowow-ci/config.sh`, require the `lingowow_dev` name/user and a
non-production database UUID, verify the running app container
`wnzn19ljdvtk84yzz4j3orj1`, and inspect only the configured database URL host
and pathname. Credentials and `DATABASE_URL` are never printed.

Do not edit the plan after review. If the dev snapshot no longer matches the
archived `previousRows`, the CAS or inventory checks abort the transaction and
the default rollback leaves the database unchanged.
