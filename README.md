# AI Student Document Audit Assistant

A lightweight, browser-based tool that helps university students check whether their administrative documents are complete before submitting them. Built as a capstone project demo — no server, no database, no external libraries.

> **Disclaimer:** This is a demo and educational project. The audit result is informational only and does **not** constitute an official verification from any university, institution, or government body. Always confirm your document requirements directly with your faculty's academic or student affairs office.

---

## Background

Anyone who has gone through graduation registration, scholarship applications, or academic leave at a university knows how easy it is to miss one document in a long checklist — and how frustrating it is to find out only after you've queued at the office. Requirements are often scattered across PDF announcements, notice boards, or WhatsApp group messages, and they sometimes include conditions like "IPK minimal 3.00" that are easy to overlook.

This project explores whether a simple client-side tool could help students do a quick self-check before showing up. The idea is not to replace the official process, but to give students a way to catch obvious gaps on their own time, without needing an internet connection or a university account.

---

## Who This Is For

- University students preparing documents for graduation registration, scholarship applications, or academic leave
- Anyone who wants to understand how a simple rule-based audit system works
- Developers or students looking for a minimal example of a document checklist tool built with plain HTML, CSS, and JavaScript

---

## How It Works

The application runs entirely in your browser. There is no backend, no database connection, and no data is sent anywhere.

The audit flow:

1. **Enter the requirements** — type or paste a list of required documents, one per line. You can add conditional requirements using an em dash, for example: `Transkrip Nilai — IPK minimal 3.00`.
2. **Add your documents** — use the "Informasi Dokumen" table to list each document you have. For each entry, you can optionally specify the file format (PDF, JPG, PNG, Word), the document date, and a free-text note (e.g. `IPK 3.45`, `sudah dilegalisir`).
3. **Run the audit** — click the Audit Dokumen button. The system compares your documents against the requirements and groups the outcome into three categories.

### The three outcomes

| Result | Meaning |
|---|---|
| ✅ **Terpenuhi** | The document is present and any stated condition is either absent or verified from your notes |
| ❌ **Belum Tersedia** | The document name was not found in your list at all |
| 🔎 **Belum Dapat Ditentukan** | The document exists, but there is a condition (e.g. minimum GPA) that the system cannot verify because you haven't provided the relevant value |

The app also surfaces **Potensi Masalah** — things like a format mismatch (a requirement asks for PDF but you selected JPG) or a condition that appears unmet based on your notes — and **Rekomendasi Tindakan**, a short list of next steps.

### Condition resolution from notes

When a requirement has a numeric condition (`minimal X` or `maksimal X`), the system checks the **Catatan** field of the matching document for a recognisable decimal value. For example:

- Requirement: `Transkrip Nilai — IPK minimal 3.00`
- Document catatan: `IPK 3.45`
- → System resolves this as **Terpenuhi** (3.45 ≥ 3.00)

If no value is found in the notes, the requirement stays as **Belum Dapat Ditentukan** — the system will not assume the condition is met just because the document exists.

---

## Main Features

- **Requirement presets** — one-click chips to auto-fill the requirements textarea for Pendaftaran Wisuda, Pengajuan Beasiswa, Cuti Akademik, and Beasiswa with conditions
- **Demo case loader** — a dropdown of seven pre-built synthetic cases covering complete, incomplete, and ambiguous scenarios
- **Structured document input** — per-document fields for name, format, date, and notes, rather than a plain text list
- **Ambiguous-requirement handling** — the system distinguishes between a document that is missing and one that is present but whose condition cannot be confirmed
- **Format-mismatch detection** — if a requirement specifies a format and your document has a different format, it is flagged in Potensi Masalah
- **Condition resolution from notes** — numeric thresholds in requirements are checked against values you type in the Catatan field
- **Responsive layout** — works on mobile and desktop
- **Works offline / file:// protocol** — if `fetch` fails (e.g. you open the file directly without a local server), the app falls back to an identical inline dataset embedded in `app.js`

---

## The Demo Dataset

The file [`data/demo_cases.json`](data/demo_cases.json) contains **seven synthetic student cases** and **four requirement presets**. All names, document lists, and scenarios are entirely made up for demonstration purposes. They are not based on real student records from any institution.

| Case | Scenario |
|---|---|
| DEMO-001 | Pendaftaran Wisuda — semua dokumen lengkap |
| DEMO-002 | Pendaftaran Wisuda — surat bebas perpustakaan dan laboratorium belum ada |
| DEMO-003 | Pengajuan Beasiswa — semua dokumen lengkap |
| DEMO-004 | Pengajuan Beasiswa — slip gaji dan kartu keluarga belum ada |
| DEMO-005 | Cuti Akademik — semua dokumen lengkap |
| DEMO-006 | Cuti Akademik — surat persetujuan orang tua belum ada |
| DEMO-007 | Beasiswa dengan kondisi — semua dokumen ada, tapi kondisi IPK dan penghasilan belum dapat ditentukan |

You can also type your own requirements and documents directly into the form — the demo cases are just there so you can quickly see how each audit outcome looks without filling everything in manually.

---

## Example Audit Scenarios

### Scenario 1 — Everything is ready

**Requirements:**
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

**Documents added:** all eight, no format or condition specified.

**Result:** ✅ Dokumen Lengkap — all 8 requirements satisfied.

---

### Scenario 2 — Two documents missing

Same requirements as above, but the student has not yet obtained Surat Bebas Pustaka and Surat Bebas Laboratorium.

**Result:** ⚠️ Hampir Lengkap — 2 of 8 requirements unresolved. Both missing documents listed under ❌ Belum Tersedia. Recommended actions: obtain each missing document and contact the academic office.

---

### Scenario 3 — Conditioned requirement, no GPA provided

**Requirements:**
```
Transkrip Nilai — IPK minimal 3.00
Kartu Tanda Mahasiswa (KTM)
```

**Documents added:** Transkrip Nilai (format: PDF, no notes), KTM.

**Result:** 🔎 Perlu Verifikasi — 1 of 2 requirements cannot be determined. The transcript exists, but whether the GPA meets the 3.00 threshold is unknown. The system explicitly says it cannot verify this — it does not guess.

---

### Scenario 3b — Same requirement, GPA provided in notes

Same as above, but the Transkrip Nilai row has **Catatan:** `IPK 3.45`.

**Result:** ✅ Dokumen Lengkap — the system detects 3.45 ≥ 3.00 and marks the requirement as satisfied.

---

### Scenario 4 — Format mismatch

**Requirements:**
```
Pas Foto PDF
```

**Documents added:** Pas Foto PDF, format selected: JPG.

**Result:** 🔎 Perlu Verifikasi — the document name matches, but the format conflicts with the requirement. Listed under Potensi Masalah with an explanation of which format was expected versus what was provided.

---

## Limitations

This is a demo project. There are several things it intentionally does not do:

- **It cannot verify that a document is authentic or valid.** It only checks whether a name you typed matches a requirement you typed.
- **It does not connect to any university system.** There is no real database of requirements, deadlines, or student records.
- **Condition resolution is limited to simple numeric thresholds** (`minimal X`, `maksimal X`). Conditions written in other forms (e.g. "sudah dilegalisir", "masa berlaku 6 bulan") are not parsed and will always be marked as Belum Dapat Ditentukan.
- **Matching is name-based and case-insensitive**, but spelling must be consistent. `Transkrip Nilai` and `Transkip Nilai` are treated as different documents.
- **The demo dataset is synthetic.** It was created to demonstrate the different audit outcomes and does not reflect any actual university's requirements.
- **No data persistence.** Refreshing the page resets everything. Nothing is saved between sessions.

---

## Technologies Used

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, flexbox, CSS grid) |
| Logic | Vanilla JavaScript (ES6+), no libraries or frameworks |
| Data | A single JSON file (`data/demo_cases.json`) loaded via `fetch` |

No build tools, no package manager, no bundler. The entire project is four files.

---

## Running the Project Locally

Because the app loads `data/demo_cases.json` via `fetch`, you need to serve it over HTTP rather than opening `index.html` directly from the file system — otherwise the fetch will be blocked by the browser's same-origin policy. If the fetch does fail (e.g. you open the file directly anyway), the app automatically falls back to an identical dataset embedded inside `app.js`, so it will still work.

**Option 1 — Python (simplest, no install needed if Python is already present):**

```bash
# Python 3
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

**Option 2 — Node.js `http-server`:**

```bash
npx http-server -p 8080
```

Then open `http://localhost:8080`.

**Option 3 — VS Code Live Server extension:**

Right-click `index.html` in the VS Code explorer and choose **Open with Live Server**.

**Option 4 — Open directly (fallback mode):**

Just double-click `index.html`. The fetch will fail silently and the app will use its embedded fallback data. All features work; you just won't be picking up any future changes to `demo_cases.json` at runtime.

---

## Project Structure

```
├── index.html          # Single-page UI (Indonesian language)
├── style.css           # All styles — no external CSS
├── app.js              # All application logic — no external JS
└── data/
    └── demo_cases.json # Synthetic demo cases and requirement presets
```

---

## Responsible AI and Privacy Note

**No data leaves your browser.** The application runs entirely client-side. Whatever you type into the form — document names, file formats, dates, or notes — stays on your device. Nothing is sent to a server, logged, or stored anywhere.

Because the audit is based entirely on text matching and simple numeric comparisons written by hand, the results reflect only what you type. The system cannot read actual files, cannot check official records, and cannot confirm whether a document is real, current, or accepted by any institution.

If you use this for actual document preparation, treat the results as a personal checklist, not as confirmation that your submission will be accepted. For anything that matters, always verify with your campus directly.

---

## About This Project

This project was built as part of a capstone/final project submission exploring how a simple rule-based system can be designed to handle uncertainty honestly — specifically, by refusing to call a requirement satisfied when the information needed to verify it hasn't been provided. The focus was on keeping the logic transparent and the interface straightforward, without introducing unnecessary complexity.

The application is fully open and can be inspected, modified, or extended by anyone. If you want to add new requirement presets or demo cases, edit [`data/demo_cases.json`](data/demo_cases.json) — no code changes needed.
