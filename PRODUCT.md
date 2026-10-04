# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Radiology residents at Gujranwala Teaching Hospital / Gujranwala Medical College (Department of Diagnostic Radiology). A senior radiologist reads the images and hands the resident a handwritten, positives-only note; the resident turns it into a consultant-grade report and issues it. Used all day on hospital workstations (1280–1920 px), and on phones to photograph and upload notes.

## Product Purpose

PolytronX turns a photo of the senior's handwritten note into a complete, structured report body (Technique → Findings → Impression → Recommendations) that obeys the binding AGENTS.md rulebook, lets the resident verify it beside the source note, and issues the locked A4 PDF. Success: a report the resident can sign after checking it, with nothing invented and nothing omitted.

## Positioning

The draft is produced under AGENTS.md's source convention (nothing omitted, nothing invented, complete by convention, qualitative normals) and the resident verifies it side by side with the original note before the PDF is issued; the editor is the live twin of that PDF.

## Operating Context

- Notes arrive as phone photos (WhatsApp/CamScanner), via drag-and-drop, the camera, or the `input/` folder sync.
- AI drafting runs through the owner's CLI subscription on the reporting PC via a host-side worker (`npm run worker`): Antigravity (`agy`, Gemini 3.8 Flash High) or OpenCode (`opencode`, any vision-capable model); engine and model are chosen in the app Settings. When the engine is offline, cases wait in the queue or are written manually.
- Output is the locked A4 PDF (`src/pages/print/[id].astro`) with the department letterhead and crests.
- Reading rooms are dim; wards and offices are bright.

## Capabilities and Constraints

- Case states: Queued, Generating, Draft, Blocked (AI needs a clarification, AGENTS.md §6.4), Failed, Finalized; archiving is a separate flag.
- The AI must never fabricate: unknown header variables stay empty and print as "Not stated in source"; only a human writes the urgent call log.
- The resident's own corrections outrank the note (AGENTS.md §2) and are fed to the next AI run as "Notes for the AI".
- Wording check (AGENTS.md H28, `src/lib/wording.ts`): every serious medical term, certainty word, own-advice word and number in the red box, findings, impression and recommendations is compared with the AI's transcription of the senior's note (plus the owner's corrections). Anything the senior didn't write is flagged live (banner, ringed lines, "Check wording" chip, audit panel), and a draft with flagged wording cannot be issued as a PDF until the resident confirms exactly that wording (the server enforces it, and any edit that changes the flagged set voids the confirmation). Negated standard normal statements in the findings list are exempt; legacy cases and manual reports (no transcription) are not checked. It is a safety net for the resident's own check, not a replacement.
- Access: HTTP Basic Auth on the production deployment (BASIC_AUTH_PASS); localhost stays open.

## Brand Commitments

- Name: PolytronX — Radiology reporting.
- The printed report's identity is binding: navy `#0F2C59`, cobalt `#2563EB`, the two-cell navy/cobalt stripe, the GMC and GTH crests, uppercase section headers with a cobalt rule, organ-region chips, the impression card. The PDF template design is locked.
- British spelling in clinical text.

## Evidence on Hand

- Five real legacy cases (pre-2026-10, audit status LEGACY) with their note photos in `uploads/`.
- No testimonials, metrics or accuracy claims exist; none may be invented.

## Product Principles

1. Fidelity over fluency: never show or print a fact the source does not contain.
1a. The senior's words only (owner ruling, 2 Oct 2026, AGENTS.md H28): the report uses the senior's own diagnostic and descriptive terms. The AI never swaps in a synonym, a stronger or weaker term (a written "breach" is never "perforation"), an added label, cause or complication, or a certainty word the senior did not write, and it adds no recommendations of its own. It may expand abbreviations, fix spelling, and add only the fixed normal statements, the technique line and the fallback "Clinical correlation is advised."
2. The resident verifies; the interface makes checking against the note fast and obvious.
3. What you edit is what prints.
4. Calm, legible, state-first: every case shows what it needs next.

## Accessibility & Inclusion

WCAG 2.2 AA contrast, visible focus, keyboard operation (shortcuts for the queue), reduced-motion support, 44 px touch targets on phones.
