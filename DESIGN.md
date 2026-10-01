---
name: PolytronX
description: Radiology reporting workspace whose editor is the live twin of the issued A4 report.
colors:
  brand: "#0F2C59"
  brand-ink: "#0F2C59"
  accent: "#2563EB"
  accent-soft: "#EAF1FE"
  on-accent: "#FFFFFF"
  canvas: "#ECF0F6"
  surface: "#FFFFFF"
  surface-2: "#F6F8FB"
  surface-3: "#EDF1F6"
  line: "#E1E7EF"
  line-strong: "#CBD5E1"
  ink: "#0F172A"
  ink-2: "#334155"
  muted: "#546277"
  faint: "#677487"
  success: "#047857"
  success-soft: "#E6F5EE"
  warning: "#B45309"
  warning-soft: "#FDF3E4"
  danger: "#C81E1E"
  danger-soft: "#FDEEEE"
  sheet: "#FFFFFF"
  sheet-ink: "#0F172A"
  sheet-line: "#E2E8F0"
  sheet-tint: "#F1F5F9"
  lightbox: "#0A0E15"
  lightbox-glass: "#0C121C"
  note-paper: "#FBFAF7"
  brand-dark: "#3B6FE0"
  brand-ink-dark: "#B0C6F8"
  accent-dark: "#7DA4FA"
  accent-soft-dark: "#1B2A48"
  canvas-dark: "#090D15"
  surface-dark: "#101622"
  surface-2-dark: "#141B29"
  surface-3-dark: "#1B2435"
  line-dark: "#202B3D"
  line-strong-dark: "#2E3C52"
  ink-dark: "#E7ECF3"
  ink-2-dark: "#C4CDDA"
  muted-dark: "#9AA7BA"
  faint-dark: "#808DA0"
  success-dark: "#62CEA0"
  success-soft-dark: "#102C23"
  warning-dark: "#F4B256"
  warning-soft-dark: "#34250F"
  danger-dark: "#F87979"
  danger-soft-dark: "#3A1519"
  sheet-dark: "#131A27"
  sheet-ink-dark: "#E2E8F0"
  sheet-line-dark: "#283447"
  sheet-tint-dark: "#1B2435"
  lightbox-dark: "#05080D"
typography:
  display:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
  body:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  body-small:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.125rem"
  control:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  label:
    fontFamily: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
  document-letterhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  document-section:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 800
    lineHeight: "1.125rem"
    letterSpacing: "0.08em"
  document-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  document-mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.9375rem"
    fontWeight: 800
    lineHeight: "1.4rem"
rounded:
  doc-field: "3px"
  doc-card: "4px"
  doc-sheet: "6px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  "0.5": "2px"
  "1": "4px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "7": "28px"
  "10": "40px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "#0F2C59E6"
  button-primary-lg:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
  button-ghost:
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    height: "36px"
    width: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  status-chip-queued:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  status-chip-draft:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  status-chip-blocked:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  status-chip-failed:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  status-chip-finalized:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  input-search:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 36px 0 32px"
    height: "36px"
  input-search-focus:
    backgroundColor: "{colors.surface}"
  case-row:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  case-row-hover:
    backgroundColor: "{colors.surface-3}"
  case-row-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.brand-ink}"
  segmented:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.lg}"
    padding: "2px"
  segmented-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    height: "28px"
  banner-info:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  banner-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  banner-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  banner-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  report-sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.sheet-ink}"
    typography: "{typography.document-body}"
    rounded: "{rounded.doc-sheet}"
    width: "min(100%, 52rem)"
  organ-chip:
    backgroundColor: "{colors.sheet-tint}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.doc-field}"
    padding: "2px 8px"
  impression-card:
    backgroundColor: "{colors.sheet-tint}"
    textColor: "{colors.sheet-ink}"
    rounded: "{rounded.doc-card}"
    padding: "14px 16px"
  critical-box:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.doc-card}"
    padding: "12px 16px"
  lightbox:
    backgroundColor: "{colors.lightbox}"
---

# Design System: PolytronX

## Overview

**Creative North Star: "The Live Twin"**

The workspace is the live twin of the issued A4 report: what the resident edits is visibly what prints. The report sheet in the right pane carries the locked print template's own letterhead, crests, two-cell navy/cobalt stripe, uppercase section headers on a cobalt rule, organ-region chips, critical box and impression card, set in the template's own system font stack, and every value on it is editable in place. Everything around the sheet is quiet chrome on cool slate, set in Inter Variable, whose only job is to move the resident from a photographed note to an issued PDF. The system refuses the generic SaaS form-and-card editor: there is no field-by-field form, no dashboard of cards, no second rendering of the report.

The second material is the reading-room light box. The senior's handwritten note sits in the centre pane on a near-black backlit field that stays dark in both themes, with white-alpha controls on top. When the AI reads the note, a cobalt scan beam sweeps the paper; when the draft lands, the sheet develops section by section out of a soft blur while the stripe and section rules draw themselves left to right. That is the one signature moment. Everything else moves briefly and only to explain a change of state.

Density is workstation density: a 14px base on a fixed eight-step scale, 36px controls, 56px bars, 1px hairlines. The layout is fixed in shape: case queue left, note light box centre, report sheet right, Approve & download always top-right.

**Key Characteristics:**
- The report sheet is the PDF's live twin: same institutional language, same hierarchy, editable in place.
- Two voices: Inter Variable for chrome, the print template's system stack for anything that prints.
- Navy carries authority and the final action; cobalt carries live work, focus and the printed rules.
- A dark light box for the source note in both themes.
- Flat chrome separated by hairlines; the paper is the one lifted object.
- One colour per case state, everywhere the state appears.
- Light and dark themes from one set of RGB-triplet tokens, with alpha modifiers.

## Colors

Two institutional blues from the printed report on a cool slate neutral ramp, with four state colours and a separate always-dark light box. Tokens are stored as RGB triplets in `src/styles/global.css` (light under `:root`, dark under `.dark`) so Tailwind's `/alpha` modifiers work in both themes; the hex values here are the same colours.

### Primary
- **Letterhead Navy** (`brand` #0F2C59; dark #3B6FE0): the department's own colour. Fills the primary button (Approve & download, Re-queue, Retry, Generate with AI), the brand mark, the numbered step discs of the first-run screen, the toast action button, the navy cell of the letterhead stripe and the impression card's left rule.
- **Navy Ink** (`brand-ink` #0F2C59; dark #B0C6F8): navy as text. Letterhead title, sheet section headers, organ-chip text, impression numbers, the token number, the selected case name. In dark mode it lifts to a pale periwinkle so headings stay legible on the dark sheet.

### Secondary
- **Report Cobalt** (`accent` #2563EB; dark #7DA4FA): live work and the printed rules. Focus rings, the caret, text selection (22% alpha), the 1.5px rule under each sheet section header, the cobalt cell of the stripe, normal-finding bullets, the Recommendations heading, Queued and Generating states, the processing progress bar, the scan beam, drop-target hover.
- **Cobalt Wash** (`accent-soft` #EAF1FE; dark #1B2A48): the selected case row, info banners, Queued/Generating chip fill, hover tint on editable sheet fields (55% alpha), the focused meta cell (35% alpha).
- **On Accent** (`on-accent` #FFFFFF): text and icons on navy fills.

### Tertiary (state)
- **Verified Green** (`success` #047857, wash `success-soft` #E6F5EE): Finalized, the Saved tick, the engine-online dot.
- **Clarification Amber** (`warning` #B45309, wash `warning-soft` #FDF3E4): Blocked, the offline-engine banner, the Unsaved dot, and the abnormal-finding marker and row tint on the sheet.
- **Failure Red** (`danger` #C81E1E, wash `danger-soft` #FDEEEE): Failed, the save error, a load failure, the urgent toggle and the critical box. Nothing else.

### Neutral
- **Cool Canvas** (`canvas` #ECF0F6; dark #090D15): the app background and the report pane behind the sheet.
- **Surface** (`surface` #FFFFFF; dark #101622): sidebar, header bars, dialogs, menus, panels, toasts, secondary buttons.
- **Surface 2 / Surface 3** (`surface-2` #F6F8FB, `surface-3` #EDF1F6): input fill and dialog footers; hover fill, segmented track, neutral chips, the token badge.
- **Hairline / Strong Line** (`line` #E1E7EF, `line-strong` #CBD5E1): all 1px separators and borders; strong line for secondary-button borders, dashed drop zones and scrollbar thumbs.
- **Ink, Ink 2, Muted, Faint** (`ink` #0F172A, `ink-2` #334155, `muted` #546277, `faint` #677487): headings and values; body and control text; secondary text, labels, placeholders; tertiary metadata and separators.
- **Sheet, Sheet Ink, Sheet Line, Sheet Tint** (`sheet` #FFFFFF, `sheet-ink` #0F172A, `sheet-line` #E2E8F0, `sheet-tint` #F1F5F9): the report twin's own paper palette, mapped from the print template's white page, slate text, #E2E8F0 rules and #F1F5F9 organ-chip fill. In dark mode the sheet becomes a dark paper (#131A27) rather than staying white.
- **Light Box** (`lightbox` #0A0E15; dark #05080D) with **Light Box Glass** (`lightbox-glass` #0C121C at 95%): the note's backlit field, with a faint white radial glow at 5%; glass is the floating zoom toolbar and the reading label over it.
- **Note Paper** (`note-paper` #FBFAF7): the warm off-white of the senior's handwritten note, used for the verbatim transcript page in the light box and the note in the first-run illustration. It stays light in both themes.

### Named Rules
**The Printed Pair Rule.** Navy and cobalt keep the jobs they have on the PDF. Navy is authority: the department, the headings, the one action that issues the report. Cobalt is the working line: rules, bullets, focus, the AI's live state. Do not swap them, and do not add a third brand hue.

**The One Colour Per State Rule.** Queued and Generating are cobalt, Draft is neutral, Blocked is amber, Failed is red, Finalized is green, Archived is neutral and muted. The same mapping is used in the chip, the banner and the toast for that state.

**The Red Is For Failure Rule.** Red marks a failure (generation, save, load) and the urgent clinical notification. It is never decoration, emphasis or a hover colour.

**The Light Box Stays Dark Rule.** The note viewer is near-black in both themes, its controls are white at 6 to 15% alpha with slate text, and the paper inside it keeps its own colour. Never theme the light box.

## Typography

**Chrome Font:** Inter Variable (with Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Document Font:** the print template's system stack: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif
**Mono Font:** ui-monospace (with SFMono-Regular, Menlo, Consolas)

**Character:** Inter is the instrument panel: compact, medium-weight, tightly tracked at heading sizes. The document stack is the paper: it is literally the font the PDF prints in, so the twin reads like the issued report and nothing shifts when it prints.

The scale is fixed, not fluid, on a 16px root (ratio about 1.15): xs 12, sm 13, base 14, md 15, lg 16, xl 18, 2xl 22, 3xl 28 px. The body defaults to base (14px). Figures in tokens, dates, counts and timers use tabular numerals.

### Hierarchy
- **Display** (600, 28px from sm up, 22px on phones, -0.02em): the first-run headline only.
- **Headline** (600, 16px, -0.015em): the patient name in the case header, dialog and panel titles.
- **Title** (600, 14px): banner titles, case-row names, section labels in panels.
- **Body** (400, 14px; 13px for secondary text): banner bodies, descriptions, list metadata. Explanatory paragraphs cap at about 34rem.
- **Label** (500, 12px): chips, keyboard hints, tooltips, the engine status.
- **Document letterhead** (900, uppercase, 16px when the sheet is wide, 13px when narrow): the department line.
- **Document section** (800, uppercase, 13px, 0.08em): Technique, Findings, Impression; the section tag beside each runs 12px, 700, 0.1em in faint.
- **Document body** (400 to 600, 15px, line-height 1.625 for technique and findings, 1.375 for list items): every editable value on the sheet. Structures are 600, impression points 600, abnormal findings 500.
- **Sheet label** (600, uppercase, 12px, 0.06em, muted): the meta-grid cell labels. They print, so under the Two Voices Rule they are set in the document stack.
- **Document mono** (800, 15px, navy ink): the token / radiology ID and the document reference.

### Named Rules
**The Two Voices Rule.** Anything that prints is set in the document stack (`font-document`): the sheet, the verbatim transcript, audit-sheet bodies. Anything that only exists on screen is set in Inter, including the affordances that live inside the sheet: Add region, Add impression point, helper text, the unprinted MR number.

**The Printed Caps Rule.** Uppercase with positive tracking belongs only to text the PDF itself sets in caps: letterhead, section headers, organ chips, meta labels, sign-off heads, the critical-box heading. Chrome labels are sentence case and never tracked out.

**The Fixed Scale Rule.** Use the eight steps and nothing else. Nothing renders below 12px, and there is no clamp() or viewport-scaled type.

## Layout

The desktop workspace (from 1024px) is a fixed three-part layout on a full-height, non-scrolling shell:

- **Case queue**, left, 304px, collapsible with `[` (animated width, 280ms). Brand bar 56px, intake (drop zone, sync, engine status), search, an Active/Archived segmented switch, the scrolling case list, and a 48px footer with the theme switch.
- **Header**, 56px, across the working area: patient name, token, details, status chip, save state on the left; AI action, Audit sheet, Print preview, focus toggle and the overflow menu on the right, with **Approve & download** always the last, top-right item. Action labels show from 1536px; below that they are icon buttons with tooltips, so the bar never wraps.
- **Note light box**, centre, a resizable panel (default 42%, minimum 26%) that collapses to 0 for focus mode (`F`).
- **Report pane**, right (minimum 34%), on canvas: a sticky 44px section nav (Patient, Technique, Findings, Impression, plus the urgent toggle) at 95% canvas, then the state banner, the sheet and the unprinted Notes for the AI, all centred at a 52rem maximum.

The split handle is a 1px hairline with a widened invisible hit area that turns cobalt on hover, focus and drag.

Below 1024px the queue becomes a left drawer (min(88vw, 22rem)) and the working area becomes a Report/Note segmented tab bar. Below 640px a bottom action bar holds the AI action and a large Approve & download, padded for the safe area. Touch and pen pointers get 44px minimum targets, and hover-revealed controls are always visible.

The sheet lays itself out by its own width, not the viewport's: it is a size container, and the `wide` variant switches at 32rem of sheet width. Wide: 40px side gutter, 4-column meta grid, finding rows in three columns (1.5rem marker, 11rem structure, text), a two-column sign-off and the full letterhead with the faculty line. Narrow: 16px gutter, 2-column meta grid, structure stacked above its text.

Spacing runs on a 4px base. Recurring steps: 2px between list rows, 8 and 12px inside controls, 16 to 20px panel padding (dialog headers and footers use 20px horizontal), 28px between sheet sections, 40px sheet gutter when wide.

## Elevation & Depth

Chrome is flat and layered by tone: canvas under surfaces, with 1px hairlines doing the separation. The report sheet is the one lifted object in the working view, a sheet of paper with a soft long shadow and a hairline ring. Overlays (dialogs, menus, panels, drawers, toasts) use the large shadow. Every shadow is a soft ambient drop computed from a theme shadow colour: slate at low alpha in light mode, black at much higher alpha in dark mode so it still reads. Inside the light box the note paper floats on a deep black shadow of its own.

### Shadow Vocabulary
- **Hairline lift** (`xs`): secondary buttons, the active segment and section pill, the drop-zone icon disc, the Notes for the AI panel.
- **Button** (`sm`): primary buttons.
- **Tooltip** (`md`): tooltips.
- **Overlay** (`lg`): dialogs, menus, side panels, the queue drawer, toasts, the drop overlay card.
- **Paper** (`sheet`): the report sheet and its skeleton, always with a 1px sheet-line ring at 70%.

### Named Rules
**The One Paper Rule.** Only the report sheet (and the note paper in the light box) is lifted at rest. Chrome panels, banners and list rows sit flat; a new surface gets a shadow only if it floats over the workspace.

## Shapes

Two radius families. Chrome is gently rounded: 6px for skeleton bars, 8px for buttons, inputs, menu items, tooltips and keyboard hints, 12px for case rows, banners, menus and the segmented track, 16px for dialogs. Status chips, the zoom toolbar and the reading label are full pills. The document twin keeps the print template's tighter corners: 3px for editable fields and organ chips, 4px for the meta grid, impression card and critical box, 6px for the sheet itself. The letterhead stripe is a 3px bar split 70/30, navy then cobalt.

Borders are 1px hairlines everywhere. Dashed borders mean "drop or add here": the photo drop zone, the empty findings box, the Add region button, the drop overlay.

### Named Rules
**The Twin-Only Side Rule.** Exactly two elements carry a 4px left rule, and both live inside the document twin because they reproduce the PDF's own devices: the impression card (navy rule, from the print template's impression card) and the critical box (red rule, from its critical alert). App chrome never uses a side stripe: the selected case row is a full cobalt wash, state banners are full-border tints, and separators are full hairlines. A new sheet element may use a side rule only if the print template draws one there; a new chrome element never does.

## Components

### Buttons
Quiet, compact and tactile: a 0.97 press scale, 120ms colour transitions, a spinner that keeps the label so the button never changes width.
- **Shape:** gently curved (8px radius); 12px on the large size.
- **Primary:** navy fill, white text, 36px tall, 14px side padding, small shadow; hover drops to 90% navy, press to 85%. In the header the primary is always Approve & download (Download PDF once finalized). While it is disabled (50%, with a tooltip saying what is still needed), the state banner may carry the one other primary, the case's next step (Generate with AI, Re-queue, Retry). Only one primary is ever enabled at a time.
- **Secondary:** surface fill, strong-line border at 80%, ink-2 text, hairline shadow; hover fills surface-2 and darkens text to ink. The default variant.
- **Ghost:** no fill, ink-2 text, surface-3 on hover. Used for header actions and icon buttons.
- **On dark:** slate text with a 10% white hover, for controls over the light box.
- **Sizes:** 32px small, 36px default, 44px large (mobile bar, first-run). Icon-only buttons are 32 or 36px square, always named for assistive tech and explained by a tooltip with its shortcut.

### Status chips
- **Style:** full pill, 24px tall, 12px medium text with a 14px icon; fill and text from the One Colour Per State Rule.
- **State:** Queued shows a softly pulsing dot, Generating a spinning loader, Draft a pen, Blocked a question bubble, Failed a triangle, Finalized a badge check; Archived is a neutral chip that overrides the state.

### Cards / Containers
- **Corner Style:** 12px for chrome containers (banners, Notes for the AI, audit lists); 4px for containers inside the sheet.
- **Background:** surface for neutral containers; a state wash for banners.
- **Shadow Strategy:** flat, except the hairline lift on the Notes for the AI panel (see Elevation & Depth).
- **Border:** 1px hairline; banners use their state colour at 20 to 25% for the full border.
- **Internal Padding:** 12px by 16px for banners, 14px by 16px for panels.

### State banner
The case's next step, above the sheet. Icon, title, a short body and at most two small buttons; tones are neutral, info, warning, danger and success, each a full-border tint with the icon in the state colour. Processing shows a live elapsed timer in cobalt. It slides in from above over 300ms.

### Inputs / Fields
- **Style:** chrome inputs are 36px, surface-2 fill, 1px hairline border, 8px radius, muted placeholder; hover strengthens the border.
- **Focus:** cobalt border, surface fill and a 2px cobalt ring at 20%. Everything else focusable gets a 2px cobalt outline at 2px offset.
- **Sheet fields:** read as printed text at rest, with no border and no fill. Hover gives a 55% cobalt wash; focus gives the sheet colour and a 2px cobalt ring at 50%. Text areas grow with their content and never scroll internally. Read-only (finalized or archived) fields keep the printed look with no hover.

### Navigation
- **Case list:** rows of name plus status chip over token, study and date. Hover fills surface-3; the selected row is a full cobalt wash with the name in navy ink. Arrow keys move between rows, `j`/`k` move the selection, `/` focuses search. A generating case shows a thin indeterminate cobalt bar along its bottom edge. Archive and restore appear on hover.
- **Segmented control:** surface-3 track, 28px segments (36px on touch), the active segment a surface pill with a hairline shadow that slides between options on a spring with no bounce (300ms). A dark tone exists for the light box.
- **Section nav:** the same sliding pill, driven by scroll position over the sheet.

### Report sheet (signature)
The live twin. A white (or dark-paper) sheet up to 52rem wide carrying, in order: the letterhead (both crests, department in navy ink at weight 900, hospital line, faculty line when wide) over the 70/30 navy/cobalt stripe; the meta grid (hairline-separated cells, uppercase muted labels over 15px semibold values, the token in navy mono, unknown values left empty with a "Not stated" placeholder); Technique; the critical box when the case is marked urgent; Findings as organ-region chips with marker-led rows, where the marker is a cobalt dot for a normal statement and a larger amber dot with an amber row wash for an abnormal finding; the impression card with numbered points and a hairline-divided Recommendations block; and the printed sign-off and footer, so the twin ends where the page ends. Removing a region or finding offers Undo in a toast.

### Impression card and critical box
- **Impression card:** 4px corners, sheet-line border with the 4px navy left rule, sheet-tint fill at 45%, 14px by 16px padding (20px from sm). "Impression" in navy ink, Recommendations in cobalt.
- **Critical box:** 4px corners, red border at 25% with the 4px red left rule, red wash at 70%, the urgent findings in bold red and the call log in italic red at 85%. It expands into place when the case is marked urgent, and states that it prints only once the urgent findings are filled in.

### Note light box (signature)
The note on its dark field, zoomable from 60% to 800%, rotatable in quarter turns, with a floating glass pill toolbar (zoom out, fit percentage, zoom in, rotate) at the bottom and a Scan/Transcript segmented switch on top. The transcript is a note-paper page with a navy uppercase heading. While the AI reads, a cobalt scan beam a third of the paper's height sweeps top to bottom on a 2.6s loop, hidden under reduced motion.

### Motion
State changes use 120ms (fast), 180ms (base) or 260ms (slow) on a confident exponential ease-out; the theme switch crossfades over 260ms. Overlays fade with a slight scale (200ms in, 150ms out); side panels and drawers slide (300ms in, 200ms out). The signature reveal runs when a fresh draft lands on the open case: each sheet section develops from a 6px blur and a 4px rise over 560ms, staggered 90ms; each section rule and the stripe draw left to right over 640ms, the stripe's cobalt cell 320ms after the navy one. Ambient loops are limited to state: the queued dot's soft pulse, the processing bar, the skeleton shimmer, the drop target's 4px float. The only overshoot in the system is the 420ms pop of the Saved tick. All motion respects reduced-motion: loops stop and reveals fall back to a plain fade.

## Do's and Don'ts

### Do:
- **Do** treat the print template (`src/pages/print/[id].astro`) as the source of the sheet's look, and read institution text from `src/lib/institution.ts` so the twin and the PDF cannot drift.
- **Do** set printed text in `font-document` and on-screen text in Inter, per the Two Voices Rule.
- **Do** keep Approve & download as the single navy primary, top-right of the case header (bottom bar on phones), disabled with a reason until the case can be issued.
- **Do** mark selection with a full cobalt wash and state with full-border tints.
- **Do** express every state through the One Colour Per State mapping, in chip, banner and toast alike.
- **Do** use the semantic tokens (`bg-surface`, `text-muted`, `border-line`, `bg-accent-soft`) with alpha modifiers rather than raw palette colours, so both themes stay correct.
- **Do** gate every loop and reveal behind reduced-motion, and give touch pointers 44px targets with hover-only controls always visible.
- **Do** leave unknown header values empty so they show "Not stated" on screen and print as "Not stated in source".

### Don't:
- **Don't** build a generic SaaS form-and-card editor: no field-by-field form beside a preview, no card grid of report sections, no second rendering of the report.
- **Don't** put a coloured side stripe on any chrome element (list rows, banners, toasts, panels); the 4px left rule belongs only to the impression card and critical box inside the twin.
- **Don't** use red for anything but failure and the urgent clinical notification.
- **Don't** theme the light box or let its white-alpha controls appear outside it.
- **Don't** use uppercase tracked labels in chrome; caps belong to text the PDF prints in caps.
- **Don't** add type sizes outside the eight-step scale or render anything below 12px.
- **Don't** add shadows to flat chrome; only the paper and floating overlays are lifted.
- **Don't** use bounce easing or bouncing loops; selection pills use a spring with no bounce, and the drop target floats smoothly rather than bouncing.
