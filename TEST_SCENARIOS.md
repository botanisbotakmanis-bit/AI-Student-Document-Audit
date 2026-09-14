# Test Scenarios — AI Student Document Audit Assistant

This document describes the test scenarios used to verify that the audit logic in [`app.js`](app.js) behaves correctly. Each scenario maps to a specific code path in the `classifyRequirement()` and `audit()` functions.

The scenarios are grouped by the type of situation they test. Some of them correspond directly to the demo cases in [`data/demo_cases.json`](data/demo_cases.json); others are additional edge cases that were written to check the boundaries of the logic.

> All scenarios can be reproduced manually by opening `index.html` and entering the inputs described below, or programmatically by loading the audit logic directly in Node.js (the `audit()` function has no side effects and takes plain arrays as arguments).

---

## Scenario 1 — All documents present, no conditions

**Scenario name:** Complete graduation registration

**What this tests:** The happy path. Every requirement is a plain document name, every document is present in the list, and no conditions or format requirements are involved. The system should classify all requirements as `completed` and return an `ok` status.

**Input — requirements:**
```
Transkrip Nilai
Ijazah Sementara
Foto 3x4
Kartu Tanda Mahasiswa (KTM)
Surat Bebas Pustaka
Surat Bebas Laboratorium
Bukti Pembayaran UKT
Formulir Pendaftaran Wisuda
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | — | — | — |
| Ijazah Sementara | — | — | — |
| Foto 3x4 | — | — | — |
| Kartu Tanda Mahasiswa (KTM) | — | — | — |
| Surat Bebas Pustaka | — | — | — |
| Surat Bebas Laboratorium | — | — | — |
| Bukti Pembayaran UKT | — | — | — |
| Formulir Pendaftaran Wisuda | — | — | — |

**Expected result:**
- Status banner: `✅ Dokumen Lengkap — Semua persyaratan terpenuhi.`
- Terpenuhi: all 8 documents
- Belum Tersedia: empty
- Belum Dapat Ditentukan: empty
- Potensi Masalah: empty

**What is verified:**
- Plain name matching works case-insensitively
- The `completed` bucket receives all items when there are no gaps
- The overall status is `ok` when `unresolvedCount === 0`
- The actions list says to submit before the deadline, not to prepare missing documents

**Corresponding demo case:** DEMO-001

---

## Scenario 2 — Two documents absent from the list

**Scenario name:** Graduation registration with missing clearance letters

**What this tests:** Two of the eight required documents are simply not in the student's list. The system should classify those two as `missing` and return a `warn` status (fewer than half the requirements unresolved).

**Input — requirements:** same as Scenario 1.

**Input — documents:** same as Scenario 1, but without `Surat Bebas Pustaka` and `Surat Bebas Laboratorium`.

**Expected result:**
- Status banner: `⚠️ Hampir Lengkap — 2 dari 8 persyaratan belum terpenuhi atau belum dapat ditentukan.`
- Terpenuhi: 6 documents
- Belum Tersedia: `Surat Bebas Pustaka`, `Surat Bebas Laboratorium`
- Belum Dapat Ditentukan: empty
- Potensi Masalah: mentions 2 documents not yet available
- Rekomendasi Tindakan: one action for each missing document ("Siapkan dokumen: …")

**What is verified:**
- Documents absent from the list go into `missing`, not `ambiguous`
- `unresolvedCount` of 2 out of 8 triggers the `warn` status, not `error`
- The per-document action items name each missing document specifically

**Corresponding demo case:** DEMO-002

---

## Scenario 3 — Most documents missing

**Scenario name:** Scholarship application, only two documents prepared

**What this tests:** When more than half the requirements are unresolved, the status should be `error` rather than `warn`. This tests the threshold in the status logic (`unresolvedCount < requirements.length / 2`).

**Input — requirements:**
```
Transkrip Nilai
Kartu Tanda Mahasiswa (KTM)
Surat Keterangan Aktif Kuliah
Surat Rekomendasi Dosen
Slip Gaji Orang Tua
Kartu Keluarga
Foto 3x4
Esai Motivasi
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | — | — | — |
| Kartu Tanda Mahasiswa (KTM) | — | — | — |

**Expected result:**
- Status banner: `❌ Tidak Lengkap — 6 dari 8 persyaratan belum terpenuhi atau belum dapat ditentukan.`
- Terpenuhi: 2
- Belum Tersedia: 6 documents
- Belum Dapat Ditentukan: empty

**What is verified:**
- `unresolvedCount >= requirements.length / 2` triggers `error` status
- All missing documents are listed individually in Belum Tersedia

---

## Scenario 4 — Conditioned requirement, no notes provided

**Scenario name:** Scholarship application, GPA requirement cannot be verified

**What this tests:** This is the core ambiguous-requirement case. The requirement contains a condition (`IPK minimal 3.00`) separated by an em dash. The student has the document, but has not provided any notes. The system should classify this as `ambiguous`, not `completed`. It must not assume the condition is met.

**Input — requirements:**
```
Transkrip Nilai — IPK minimal 3.00
Kartu Tanda Mahasiswa (KTM)
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | PDF | — | *(empty)* |
| Kartu Tanda Mahasiswa (KTM) | — | — | — |

**Expected result:**
- Status banner: `🔎 Perlu Verifikasi — 1 dari 2 persyaratan belum dapat ditentukan.`
- Terpenuhi: `Kartu Tanda Mahasiswa (KTM)`
- Belum Tersedia: empty
- Belum Dapat Ditentukan: `Transkrip Nilai` with note "Kondisi belum dapat diverifikasi: IPK minimal 3.00"
- Rekomendasi Tindakan: "Konfirmasi apakah 'Transkrip Nilai' yang Anda miliki memenuhi syarat: 'IPK minimal 3.00'. Tambahkan informasi pada kolom Catatan…"

**What is verified:**
- `parseRequirement()` correctly splits `Transkrip Nilai — IPK minimal 3.00` into `docName: "Transkrip Nilai"` and `condition: "IPK minimal 3.00"`
- `resolveConditionFromCatatan()` returns `unknown` when catatan is empty
- `classifyRequirement()` returns `ambiguous` when the document is present but the condition cannot be resolved
- The system does not invent or assume the GPA value
- The ambiguous status class is applied when only ambiguous items remain (no missing)

**Corresponding demo case:** DEMO-007 (partial — that case has two conditioned requirements)

---

## Scenario 5 — Conditioned requirement, notes confirm the condition is met

**Scenario name:** Scholarship application, GPA sufficient and recorded in notes

**What this tests:** The same setup as Scenario 4, but the student has typed `IPK 3.45` in the Catatan field. The system should parse the decimal value from the notes, compare it to the 3.00 threshold, and classify the requirement as `completed`.

**Input — requirements:** same as Scenario 4.

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | PDF | — | IPK 3.45 |
| Kartu Tanda Mahasiswa (KTM) | — | — | — |

**Expected result:**
- Status banner: `✅ Dokumen Lengkap — Semua persyaratan terpenuhi.`
- Terpenuhi: both requirements
- Belum Dapat Ditentukan: empty

**What is verified:**
- `resolveConditionFromCatatan("IPK minimal 3.00", "IPK 3.45")` returns `satisfied`
- The decimal comparison 3.45 ≥ 3.00 is evaluated correctly
- The requirement moves from `ambiguous` to `completed`
- Status becomes `ok`

---

## Scenario 6 — Conditioned requirement, notes show the condition is NOT met

**Scenario name:** Scholarship application, GPA below threshold

**What this tests:** The student has typed `IPK 2.75` in the notes. The system should detect that 2.75 < 3.00 and classify this as `condition_failed`, which is treated as unresolved and surfaced in Potensi Masalah with a specific explanation.

**Input — requirements:** same as Scenario 4.

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | PDF | — | IPK 2.75 |
| Kartu Tanda Mahasiswa (KTM) | — | — | — |

**Expected result:**
- Status banner: `🔎 Perlu Verifikasi — 1 dari 2 persyaratan belum dapat ditentukan.`
- Belum Dapat Ditentukan: `Transkrip Nilai`
- Potensi Masalah: `Dokumen "Transkrip Nilai" tersedia, tapi kondisi "IPK minimal 3.00" tampaknya tidak terpenuhi berdasarkan catatan yang Anda masukkan. Periksa kembali.`

**What is verified:**
- `resolveConditionFromCatatan("IPK minimal 3.00", "IPK 2.75")` returns `not_satisfied`
- `classifyRequirement()` returns `condition_failed`
- The `condition_failed` verdict pushes the requirement into the `ambiguous` bucket (treated as unresolved)
- A specific Potensi Masalah entry is generated naming the document and the failing condition
- Status is `ambiguous`, not `ok`

---

## Scenario 7 — Conditioned requirement, maksimal threshold

**Scenario name:** Income condition verified against notes

**What this tests:** The `resolveConditionFromCatatan()` function handles both `minimal` and `maksimal` patterns. This scenario tests the upper-bound direction: `penghasilan di bawah UMR` is expressed in the requirement as `maksimal` (in a rephrased form). This scenario specifically tests the `maksimal X` regex pattern.

**Input — requirements:**
```
Slip Gaji Orang Tua — maksimal 5000000
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Slip Gaji Orang Tua | PDF | — | 4500000 |

**Expected result:**
- Status banner: `✅ Dokumen Lengkap — Semua persyaratan terpenuhi.`
- Terpenuhi: `Slip Gaji Orang Tua`

**What is verified:**
- `resolveConditionFromCatatan("maksimal 5000000", "4500000")` returns `satisfied`
- 4500000 ≤ 5000000 is evaluated correctly

---

## Scenario 8 — Format mismatch

**Scenario name:** Photo document in wrong format

**What this tests:** When a requirement line includes a format keyword (PDF, JPG, PNG, WORD), the system checks whether the format the student selected for the matching document agrees. If not, it returns `format_mismatch`, which is treated as unresolved and explained in Potensi Masalah.

**Input — requirements:**
```
Pas Foto PDF
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Pas Foto PDF | JPG | — | — |

**Expected result:**
- Status banner: `🔎 Perlu Verifikasi — 1 dari 1 persyaratan belum dapat ditentukan.`
- Belum Dapat Ditentukan: `Pas Foto PDF`
- Potensi Masalah: `Format dokumen "Pas Foto PDF" tidak sesuai: persyaratan menyebut PDF, tapi dokumen yang tersedia berformat JPG. Pastikan Anda menggunakan format yang diminta.`
- Rekomendasi Tindakan: `Pastikan "Pas Foto PDF" tersedia dalam format PDF sesuai persyaratan.`

**What is verified:**
- `extractRequiredFormat("Pas Foto PDF")` returns `PDF`
- The format field `JPG` !== `PDF` triggers `format_mismatch`
- The format-mismatch verdict is tracked separately from generic ambiguous items so that a specific, named explanation can be generated in Potensi Masalah
- The document does NOT appear in Terpenuhi

---

## Scenario 9 — Format declared as "Lainnya", no mismatch triggered

**Scenario name:** Document format marked as other/unknown

**What this tests:** The format-mismatch check intentionally skips documents where the student selected "Lainnya" (Other) as the format, because the student may not know the exact format. This scenario confirms that "Lainnya" does not produce a false mismatch even when the requirement specifies a format.

**Input — requirements:**
```
Pas Foto PDF
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Pas Foto PDF | Lainnya | — | — |

**Expected result:**
- Status banner: `✅ Dokumen Lengkap — Semua persyaratan terpenuhi.`
- Terpenuhi: `Pas Foto PDF`
- Potensi Masalah: empty

**What is verified:**
- The format check in `classifyRequirement()` has an explicit guard: `docInfo.format !== 'Lainnya'`
- "Lainnya" bypasses format comparison entirely
- The requirement is classified as `completed` based on name match alone

---

## Scenario 10 — Name mismatch (typo)

**Scenario name:** Document name with a spelling error

**What this tests:** Matching is case-insensitive but not fuzzy. A document with a misspelled name will not match the requirement even if it is clearly the same document. This is a known limitation that the system does not try to work around.

**Input — requirements:**
```
Transkrip Nilai
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkip Nilai | — | — | *(typo — missing 'r')* |

**Expected result:**
- Status banner: `❌ Tidak Lengkap — 1 dari 1 persyaratan belum terpenuhi atau belum dapat ditentukan.`
- Belum Tersedia: `Transkrip Nilai`
- Potensi Masalah: `Dokumen berikut tidak tercantum dalam persyaratan: Transkip Nilai. Pastikan nama dokumen sudah sesuai.`
- Rekomendasi Tindakan: `Periksa kembali ejaan nama dokumen agar cocok dengan daftar persyaratan.`

**What is verified:**
- `normalize()` only lowercases and collapses whitespace — it does not do fuzzy matching
- The misnamed document goes into the `extra` list (present but not matching any requirement)
- The missing requirement is `Transkrip Nilai`, not the misspelled entry

---

## Scenario 11 — Case-insensitive matching

**Scenario name:** Document names with different capitalisation

**What this tests:** The normalisation function lowercases both the requirement and the document name before comparing. This means "TRANSKRIP NILAI", "transkrip nilai", and "Transkrip Nilai" should all match each other.

**Input — requirements:**
```
Transkrip Nilai
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| TRANSKRIP NILAI | PDF | — | — |

**Expected result:**
- Status banner: `✅ Dokumen Lengkap — Semua persyaratan terpenuhi.`
- Terpenuhi: `Transkrip Nilai`

**What is verified:**
- `normalize(s)` returns `s.toLowerCase().replace(/\s+/g, ' ').trim()`
- Both sides of the comparison go through the same normalisation
- Capitalisation differences do not cause false misses

---

## Scenario 12 — Extra documents not in requirements

**Scenario name:** Student adds documents that were not requested

**What this tests:** When the student lists a document that does not appear in any requirement (either as a bare name or as the doc-name part of a conditioned requirement), the system flags it in Potensi Masalah as potentially mislabelled, rather than silently ignoring it.

**Input — requirements:**
```
Transkrip Nilai
Foto 3x4
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | — | — | — |
| Foto 3x4 | — | — | — |
| Surat Keterangan Sehat | — | — | — |

**Expected result:**
- Status banner: `✅ Dokumen Lengkap — Semua persyaratan terpenuhi.`
- Terpenuhi: both required documents
- Potensi Masalah: `Dokumen berikut tidak tercantum dalam persyaratan: Surat Keterangan Sehat. Pastikan nama dokumen sudah sesuai.`
- Rekomendasi Tindakan: `Periksa kembali ejaan nama dokumen agar cocok dengan daftar persyaratan.`

**What is verified:**
- Extra documents do not block the overall `ok` status
- They are surfaced as a potential naming issue rather than as a missing requirement
- The `extra` array is built by filtering `docInfoList` against `normReqDocNames` and `normReqFull`

---

## Scenario 13 — Conditioned requirement with em dash vs. en dash

**Scenario name:** Requirement written with en dash instead of em dash

**What this tests:** The `parseRequirement()` regex accepts both em dash (—, U+2014) and en dash (–, U+2013) as condition separators. This scenario verifies that an en dash in the requirement is handled the same way as an em dash.

**Input — requirements:**
```
Transkrip Nilai – IPK minimal 3.00
```
*(note: en dash, not em dash)*

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | — | — | IPK 3.20 |

**Expected result:**
- Status banner: `✅ Dokumen Lengkap — Semua persyaratan terpenuhi.`
- Terpenuhi: `Transkrip Nilai`

**What is verified:**
- The regex `[—–]` in `parseRequirement()` includes both Unicode dash characters
- `docName` is correctly parsed as `Transkrip Nilai` regardless of which dash was used
- Condition resolution proceeds normally

---

## Scenario 14 — Mixed outcomes in a single audit

**Scenario name:** Scholarship application with all four outcome types

**What this tests:** A single audit can produce completed, missing, ambiguous, and format-mismatch outcomes simultaneously. This scenario exercises all four code paths in one run.

**Input — requirements:**
```
Transkrip Nilai — IPK minimal 3.00
Kartu Tanda Mahasiswa (KTM)
Surat Rekomendasi Dosen PDF
Slip Gaji Orang Tua
```

**Input — documents:**

| Nama | Format | Tanggal | Catatan |
|---|---|---|---|
| Transkrip Nilai | PDF | 2024-01-15 | IPK 3.55 |
| Surat Rekomendasi Dosen PDF | JPG | — | — |

**Expected result:**
- Terpenuhi: `Transkrip Nilai — IPK minimal 3.00` (resolved via catatan)
- Belum Tersedia: `Slip Gaji Orang Tua`
- Belum Dapat Ditentukan: `Surat Rekomendasi Dosen PDF` (format mismatch: req=PDF, doc=JPG), `Kartu Tanda Mahasiswa (KTM)` (missing from list — actually goes to Belum Tersedia, not Belum Dapat Ditentukan)

Wait — KTM is not in the documents list at all, so it is `missing`, not `ambiguous`. Corrected expected result:

- Terpenuhi: `Transkrip Nilai — IPK minimal 3.00`
- Belum Tersedia: `Kartu Tanda Mahasiswa (KTM)`, `Slip Gaji Orang Tua`
- Belum Dapat Ditentukan: `Surat Rekomendasi Dosen PDF` (format mismatch)
- Status: `⚠️ Hampir Lengkap` (3 of 4 unresolved — wait, 2 missing + 1 ambiguous = 3 out of 4, which is ≥ half, so `error`)

Corrected status: `❌ Tidak Lengkap — 3 dari 4 persyaratan belum terpenuhi atau belum dapat ditentukan.`

**What is verified:**
- All four classification paths can coexist in a single audit
- The Terpenuhi list shows the full conditioned string ("Transkrip Nilai — IPK minimal 3.00") resolved via catatan
- The format-mismatch path produces a named issue in Potensi Masalah
- Missing and ambiguous counts are summed into `unresolvedCount` for status classification
- Status is `error` when unresolved count ≥ half of total requirements

---

## How to Run These Tests Manually

1. Open `index.html` in a browser (served via a local HTTP server or directly — see README).
2. Do not use the demo case loader for these tests — enter inputs manually to verify each code path.
3. For each scenario, enter the requirements in the requirements textarea (one per line) and add documents using the "+ Tambah Dokumen" button.
4. Click **Audit Dokumen** and compare the result sections to the expected output above.

## How to Run the Core Logic Programmatically

The `audit()` function in [`app.js`](app.js) is a pure function with no DOM dependencies. You can extract it and run it in Node.js by copying the relevant functions (`parseRequirement`, `resolveConditionFromCatatan`, `extractRequiredFormat`, `classifyRequirement`, `audit`) and calling `audit(requirements, docInfoList)` directly with plain arrays.

A minimal test runner was used during development to verify Scenarios 1–2, 4–6, and 8 before browser testing. The results matched in all cases.
