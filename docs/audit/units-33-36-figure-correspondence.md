# Units 33-36 figure correspondence audit

This revision corrects the confirmation status. The published source manifests expose rendered slide screenshots, not original figure payloads with SHA-256. The native review classifies every instructional candidate on these units as `instructional-candidate-published-mismatch`. No saved native-versus-published pixel comparison is present in the audit artifacts, so no figure is confirmed or stageable.

| Unit | Candidate source slides | Candidate assets | Status |
| ---: | --- | ---: | --- |
| 33 | 4, 6 | 9 | blocked-unverified |
| 34 | 4, 6 | 4 | blocked-unverified |
| 35 | 4 | 1 | blocked-unverified |
| 36 | 4, 6 | 2 | blocked-unverified |

A source slide number, published media ordinal, text sequence ratio, native bbox, and native local SHA identify follow-up candidates. They do not prove that the published rendered slide contains the same original pixels. Every candidate below therefore carries `confirmed: false`, `publishedMediaSha256: null`, and a missing-evidence blocker.

## Candidate evidence retained for follow-up

| Unit | Source slide | Native asset | Native SHA-256 | Published media | Text ratio |
| ---: | ---: | --- | --- | --- | ---: |
| 33 | 4 | `ppt/media/image12.jpg` | `176f9679a163729fb38a7eaaa23d0c4e95b30e2a0b969ad3e3dc2aa45efd5aa1` | rendered-slide-image (ordinal 1) | 0.976608 |
| 33 | 6 | `ppt/media/image14.jpg` | `375e80b8a712d16bb287f24309897525ea09a3e9ac3f35fb55bd4f4dbfbdee51` | rendered-slide-image (ordinal 1) | 0.989691 |
| 33 | 6 | `ppt/media/image10.jpg` | `78d4654af911a5a0d83d58f45b8ccdfde3f66742beeb1a4305bba7a9e5e79ded` | rendered-slide-image (ordinal 2) | 0.989691 |
| 33 | 6 | `ppt/media/image13.jpg` | `3b1fd6a47c3abc7fa745e0d74e1f258176ceff16ef223a7c8c7d034be0b5cd79` | rendered-slide-image (ordinal 3) | 0.989691 |
| 33 | 6 | `ppt/media/image8.jpg` | `210327264755df13adc2a279369a75cc73c10af9bcde140dc13a87155eb80cce` | rendered-slide-image (ordinal 4) | 0.989691 |
| 33 | 6 | `ppt/media/image6.jpg` | `cabea1165cdeb6e05d319ae5e57fedb72c990a0bcf1991757e5246d2ba95e1f6` | rendered-slide-image (ordinal 5) | 0.989691 |
| 33 | 6 | `ppt/media/image9.jpg` | `213557603377d015b37b87b405d6f655171b73f0db7d55886ee578d2bc4c8ab0` | rendered-slide-image (ordinal 6) | 0.989691 |
| 33 | 6 | `ppt/media/image11.jpg` | `0496bfbc49c4f311803e4049d5db6b2dff6a0caef8071a2f3b4775e5f6b287f6` | rendered-slide-image (ordinal 7) | 0.989691 |
| 33 | 6 | `ppt/media/image7.jpg` | `8162989ff4b4f0013e0264c95684afa776df395f83fb4d622d6abc296537c044` | rendered-slide-image (ordinal 8) | 0.989691 |
| 34 | 4 | `ppt/media/image9.jpg` | `d931da88b346615dbdf76559853d249ed3c3e9a48822a6fcaeef79d683e407c3` | rendered-slide-image (ordinal 1) | 0.989691 |
| 34 | 6 | `ppt/media/image6.jpg` | `7b8aca98de03a88f614f005ebfd03ce51dcc80268b674311d6bc9058ccaef653` | rendered-slide-image (ordinal 1) | 1.000000 |
| 34 | 6 | `ppt/media/image8.jpg` | `1f098ebfcf7dbb378a3d7e8be75fd93d728c09344980e39c6de825acba0fbe3c` | rendered-slide-image (ordinal 2) | 1.000000 |
| 34 | 6 | `ppt/media/image7.jpg` | `386dc05b70b0f42001e70ffea700b4693207911db560e6b31baa5f641dc0f865` | rendered-slide-image (ordinal 3) | 1.000000 |
| 35 | 4 | `ppt/media/image6.jpg` | `a3030929875e7041d24c095d088c9b3df7057581881deb7fb768a3ab620d07bb` | rendered-slide-image (ordinal 1) | 0.979592 |
| 36 | 4 | `ppt/media/image7.jpg` | `f8bc4f7cffad083fbd4f0a49a22af61cffcd66a7ba14191f20036f3e43bbf3fa` | rendered-slide-image (ordinal 1) | 0.979592 |
| 36 | 6 | `ppt/media/image4.jpg` | `0c9ba549ea2cdf400f4c90c03c6f9fd10f68ad0b9cce324ec449c81bb00472d5` | rendered-slide-image (ordinal 1) | 0.972840 |

The machine-readable manifest preserves each candidate's published URL, ordinal, text ratio, native SHA, bbox, and explicit missing evidence. It must be consumed as blocked evidence until a published original asset digest or saved visual comparison is added.

## Audit references

- Published source files: `docs/audit/source-files/cmnmm9ozb0015w1qkj7gth0wy.json`, `cmnmm9pbg0018w1qkdkv1gbma.json`, `cmnmm9pns001bw1qki5fh6r0j.json`, and `cmnmm9q04001ew1qke5tfufyk.json`.
- Native extracts: `docs/audit/source-files-native/unit-33.json` through `unit-36.json`.
- Reviewed roles: `docs/audit/reviewed-figures.json`.
- Whole-deck/per-slide text review: `docs/audit/native-published-match-review.json`.
- No database write, staging action, media substitution, or publication was performed.
