# Units 33-36 figure correspondence audit

This audit compares the published slide manifests with the native PPTX extracts for Units 33-36. Published slide text and media are authoritative when the native deck differs at whole-deck level. A figure is confirmed only when its reviewed instructional-candidate asset has the same SHA-256 in the published slide media, the native and published slide numbers agree, and the native bbox is present.

The audit confirms 16 instructional assets on 7 figure-bearing slides:

| Unit | Confirmed source slides | Assets |
| ---: | --- | ---: |
| 33 | 4, 6 | 9 |
| 34 | 4, 6 | 4 |
| 35 | 4 | 1 |
| 36 | 4, 6 | 2 |

Repeated template logos, footer art, audio icons, and package media are excluded. Unit 35 has no reviewed instructional figure candidate on slide 6, so no image is inferred there.

## Confirmed correspondences

The media ordinal is the zero-based position in the published slide's media array. Each SHA-256 is also the SHA of the native local asset.

| Unit | Source slide | Native media | SHA-256 | BBox (x, y, cx, cy) | Published media ordinal | Text ratio |
| ---: | ---: | --- | --- | --- | ---: | ---: |
| 33 | 4 | ppt/media/image12.jpg | 176f9679a163729fb38a7eaaa23d0c4e95b30e2a0b969ad3e3dc2aa45efd5aa1 | 5489900,534475,2565848,1710724 | 1 | 0.976608 |
| 33 | 6 | ppt/media/image14.jpg | 375e80b8a712d16bb287f24309897525ea09a3e9ac3f35fb55bd4f4dbfbdee51 | 1123500,1063975,1450199,912776 | 1 | 0.989691 |
| 33 | 6 | ppt/media/image10.jpg | 78d4654af911a5a0d83d58f45b8ccdfde3f66742beeb1a4305bba7a9e5e79ded | 2918925,1048451,1490675,912776 | 2 | 0.989691 |
| 33 | 6 | ppt/media/image13.jpg | 3b1fd6a47c3abc7fa745e0d74e1f258176ceff16ef223a7c8c7d034be0b5cd79 | 4754790,1111469,1490657,854029 | 3 | 0.989691 |
| 33 | 6 | ppt/media/image8.jpg | 210327264755df13adc2a279369a75cc73c10af9bcde140dc13a87155eb80cce | 4754794,2846030,1490705,903884 | 4 | 0.989691 |
| 33 | 6 | ppt/media/image6.jpg | cabea1165cdeb6e05d319ae5e57fedb72c990a0bcf1991757e5246d2ba95e1f6 | 1123491,2851732,1450224,903880 | 5 | 0.989691 |
| 33 | 6 | ppt/media/image9.jpg | 213557603377d015b37b87b405d6f655171b73f0db7d55886ee578d2bc4c8ab0 | 2985575,2747900,1450378,1012975 | 6 | 0.989691 |
| 33 | 6 | ppt/media/image11.jpg | 0496bfbc49c4f311803e4049d5db6b2dff6a0caef8071a2f3b4775e5f6b287f6 | 6551667,2842820,1450194,903880 | 7 | 0.989691 |
| 33 | 6 | ppt/media/image7.jpg | 8162989ff4b4f0013e0264c95684afa776df395f83fb4d622d6abc296537c044 | 6530050,1106725,1490601,903874 | 8 | 0.989691 |
| 34 | 4 | ppt/media/image9.jpg | d931da88b346615dbdf76559853d249ed3c3e9a48822a6fcaeef79d683e407c3 | 5489900,534475,2565848,1710724 | 1 | 0.989691 |
| 34 | 6 | ppt/media/image6.jpg | 7b8aca98de03a88f614f005ebfd03ce51dcc80268b674311d6bc9058ccaef653 | 5561975,2934200,2031224,1694550 | 1 | 1.000000 |
| 34 | 6 | ppt/media/image8.jpg | 1f098ebfcf7dbb378a3d7e8be75fd93d728c09344980e39c6de825acba0fbe3c | 6702228,1062045,1987475,1324631 | 2 | 1.000000 |
| 34 | 6 | ppt/media/image7.jpg | 386dc05b70b0f42001e70ffea700b4693207911db560e6b31baa5f641dc0f865 | 4458925,1062050,1987451,1324625 | 3 | 1.000000 |
| 35 | 4 | ppt/media/image6.jpg | a3030929875e7041d24c095d088c9b3df7057581881deb7fb768a3ab620d07bb | 5489900,534475,2565848,1710724 | 1 | 0.979592 |
| 36 | 4 | ppt/media/image7.jpg | f8bc4f7cffad083fbd4f0a49a22af61cffcd66a7ba14191f20036f3e43bbf3fa | 5489900,534475,2565848,1710724 | 1 | 0.979592 |
| 36 | 6 | ppt/media/image4.jpg | 0c9ba549ea2cdf400f4c90c03c6f9fd10f68ad0b9cce324ec449c81bb00472d5 | 4310175,1234300,4025050,2683350 | 1 | 0.972840 |

## Whole-deck mismatch and handoff

All four native candidates remain low-overlap at whole-deck level. That blocker applies to slides outside the exact records above; it must not be used to replace a confirmed per-slide asset, and it must not be used to copy a native figure onto a different published slide.

No generated Unit 33-36 plan JSON was present in the audited artifacts. The builder should consume only the confirmed records in the machine-readable manifest and keep any required figure without SHA, bbox, and source-slide evidence blocked. This report does not authorize database writes, publication, or media substitution.

Machine-readable evidence: docs/audit/units-33-36-figure-correspondence.json




