# Listening semantic review: Units 53–56

This review extends `listening-authored-33-52.json` with the recovered original audio for Units 53–56. Published slide text remains the source prompt; the recovered MP3 SHA-256 and transcript are the only evidence used for new answers.

## Coverage

| Unit | Lesson | Authored slide | Audio | SHA-256 | Items | Status |
| ---: | --- | ---: | ---: | --- | ---: | --- |
| 53 | `cmnmm9vul002tw1qkq6vmdn9t` | 4 | 1 | `60d8c83cbf90acf2ab91e22d763fdcae52a9b0a3a381712146e6c1f339efdb98` | 4 | reviewed |
| 53 | `cmnmm9vul002tw1qkq6vmdn9t` | 13 | 2 | `e2dbfac9997ff26812ae77a103ccf0d36de922fa0ed61b5246e9723973fe7e37` | 4 | reviewed |
| 54 | `cmnmm9w6q002ww1qkmhschbtj` | 4 | 1 | `3e66b7acccfd02b14241761a76d8085bbb99430cec23beccee5d9404ffbff7ab` | 4 | reviewed |
| 54 | `cmnmm9w6q002ww1qkmhschbtj` | 13 | 2 | `0d3deb461926d8847cdc5f9dbe03210cd03c5c24e6a499686fa8fd7b119af4d6` | 4 | reviewed |
| 55 | `cmnmm9wiv002zw1qkz23p6kdp` | 4 | 1 | `693e9e1af6b107bf33474a18d40d16d38f4245d89da9759ee7a09491202d5bf5` | 4 | reviewed |
| 55 | `cmnmm9wiv002zw1qkz23p6kdp` | 13 | 2 | `unavailable` | 0 | blocked-source-not-found |
| 56 | `cmnmm9wv00032w1qkxr02azgp` | 4 | 1 | `55e031fa88111a38719137cc621445b5dae416025d5360c3f49a3a420031ea3b` | 4 | reviewed |
| 56 | `cmnmm9wv00032w1qkxr02azgp` | 13 | 2 | `6283d8249c5241dfc7f67b39dbcca23a029f980bb67111d1a454fe26382c03f1` | 4 | reviewed |

- Seven recovered clips have 28 reviewed four-option multiple-choice items (four per clip). Every item has exactly four distinct options, one canonical answer, and an exact transcript evidence substring.
- Unit 55 Audio 2 (slide 13) is intentionally blocked. The observed source ID `1tdIPj8skOg-IT7Y1Ac9shpqw1Y6h6fQ` returns Drive “Page Not Found”; it has no SHA, transcript, items, or substitute.

## Evidence and uncertainty

- The source prompts and visible text are copied from the published source JSON for each target slide. The original prompt IDs are retained in `sourceItemIds`.
- Answer keys are semantic review of explicit transcript clauses. No raw ASR fragment is used as a question, and no claim of independent listening is made.
- U53 Audio 2 has a media-recovery placement discrepancy: the recovered Drive metadata reports `publishedSlide: 12`, while the authored listening prompt is the published slide 13 “B. Listen…” prompt. The manifest preserves both `slideNumber: 13` and `sourcePublishedSlide: 12`; the audio SHA is unchanged. Parent composer should keep this mapping explicit when attaching staged audio.
- U54 Audio 2 contains sparse punctuation and speaker names in the transcript; questions avoid assigning uncertain speaker identities and use only clear event facts.
- Unit 55 Audio 1 has a lower transcript language probability than the other recovered clips, but all four selected evidence clauses are explicit and unambiguous. Unit 55 Audio 2 remains blocked regardless of the Audio 1 review.

## Source authority

- Published decks: `docs/audit/source-files/cmnmm9vul002tw1qkq6vmdn9t.json`, `cmnmm9w6q002ww1qkmhschbtj.json`, `cmnmm9wiv002zw1qkz23p6kdp.json`, and `cmnmm9wv00032w1qkxr02azgp.json`.
- Recovery manifest: `docs/audit/unit53-56-drive-recovery.json`.
- Transcript manifest: `docs/audit/unit53-56-audio-transcripts.json`.
- Recovery review: `docs/audit/unit53-56-listening-recovery-review.json`.
