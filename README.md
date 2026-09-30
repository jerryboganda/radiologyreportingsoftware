# PolytronX — Radiology Reporting AI Assistant

An autonomous, consultant-grade radiology report generation and publication platform built with **Astro**, **React**, **Tailwind CSS**, and **SQLite (Drizzle ORM)**.

Designed to transform rough handwritten radiologist notes into publication-quality, pixel-perfect A4 diagnostic PDFs adopting the **[shadcn-labs/pdfcn](https://github.com/shadcn-labs/pdfcn)** visual standard and adhering strictly to the **AGENTS.md** clinical rulebook.

---

## ✨ Features

- **1-Click Review & Confirm Flow:**
  - Drag-and-drop ingestion of handwritten note photos.
  - Interactive side-by-side workspace: unedited note (with zoom, pan, rotate) alongside an editable structured report.
  - 1-Click **"Approve & Download PDF"** button triggering instant download of `<PatientName>_<Age>_<TokenNumber>.pdf`.
  - Built-in verification audit modal displaying verbatim line-by-line transcription and negative check assertions.
- **Publication-Grade Locked PDF Design:**
  - Standard A4 geometry budgeted to fit standard reports seamlessly onto a single page.
  - 300-DPI high-resolution vector institutional crests.
  - Corporate two-cell accent stripe (`#0F2C59` / `#2563EB`).
  - Structured RadLex organ hierarchy with bold badges.
  - Executive Impression Card with solid 4.5pt navy left border.
  - Two-column consultant sign-off block for HOD, Senior Registrars, and Residents.
- **Embedded Database & Local Storage:**
  - Zero-configuration SQLite via Drizzle ORM storing reports, tokens, and audit logs.
  - Automated PDF archiving.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Sample Clinical Data (Optional)
```bash
npx tsx src/db/seed.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### 4. Build for Production
```bash
npm run build
node dist/server/entry.mjs
```

---

## 🏛️ Clinical Rulebook Compliance (AGENTS.md)
- **Zero Invention (H1):** No abnormalities added unless in source.
- **Zero Omission (H2):** Every positive finding and measurement preserved verbatim.
- **Laterality Rule (H3):** Rigorous side consistency across Findings, Impression, and Advice.
- **Qualitative Normals (S3/S4):** Complete anatomical checklists populated qualitatively without contradicting positive findings.

---

## 📄 License
Confidential & Proprietary • Gujranwala Teaching Hospital (GMCTH / GTH) Department of Diagnostic Radiology.
