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
  lightbox-glass: "#0C121CB8"
  note-paper: "#FBFAF7"
  brand-lo: "#0A1F40"
  brand-lo-dark: "#2C5CC8"
  shimmer: "#93C5FD"
  shimmer-dark: "#BFDBFE"
  glow-1: "#2563EB38"
  glow-1-dark: "#3B6FE042"
  glow-2: "#0F2C591F"
  glow-2-dark: "#7DA4FA1A"
  scrim: "#0F172A4D"
  scrim-dark: "#0204088C"
  desk-light: "#FFFFFFD9"
  desk-light-dark: "#7DA4FA12"
  paper-glow: "#2563EB29"
  paper-glow-dark: "#3B6FE038"
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
    backgroundColor: "#FFFFFF99"
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
    backgroundColor: "#FFFFFFBF"
  case-row-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.brand-ink}"
  segmented:
    backgroundColor: "#EDF1F6BF"
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
    backgroundColor: "#0F172AD1"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  dialog:
    backgroundColor: "#FFFFFFE0"
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

The workspace is the live twin of the issued A4 report: what the resident edits is visibly what prints. The report sheet in the right pane carries the locked print template's own letterhead, crests, two-cell navy/cobalt stripe, uppercase section headers on a cobalt rule, organ-region chips, critical box and impression card, set in the template's own system font stack, and every value on it is editable in place. Everything around the sheet is glass chrome over a static navy/cobalt brand glow; nothing printed ever takes a material effect. The chrome is set in Inter Variable, and its only job is to move the resident from the senior's note to an issued PDF. There are three ways in: photograph the note, type or dictate the positive findings in Create Report, or sync the input folder. The system refuses the generic SaaS form-and-card editor: there is no field-by-field form, no dashboard of cards, no second rendering of the report.

The second material is the reading-room light box. The senior's handwritten note sits in the centre pane on a near-black backlit field that stays dark in both themes, with white-alpha controls on top. When the AI reads the note, a cobalt scan beam sweeps the paper; when the draft lands, the sheet develops section by section out of a soft blur while the stripe and section rules draw themselves left to right. That is the signature moment. The chrome adds a few supporting moments: the logo drawing its report lines on load, a cobalt sweep across a case row when the AI finishes, a light running round the one enabled primary, and a backlight that drifts behind the note. None of them touch printed content; everything else moves briefly and only to explain a change of state.

Density is workstation density: a 14px base on a fixed eight-step scale, 36px controls, 56px bars, 1px hairlines. The layout is fixed in shape: case queue left, note light box centre, report sheet right, Approve & download always top-right.

**Key Characteristics:**
- The report sheet is the PDF's live twin: same institutional language, same hierarchy, editable in place.
- Two voices: Inter Variable for chrome, the print template's system stack for anything that prints.
- Navy carries authority and the final action; cobalt carries live work, focus and the printed rules.
- A dark light box for the source note in both themes.
- Glass chrome (translucent surface, 1px edge light, hairlines) over a static brand glow; the paper is still the one object with a drop shadow at rest.
- One colour per case state, everywhere the state appears.
- Light and dark themes from one set of RGB-triplet tokens, with alpha modifiers.

## Colors

Two institutional blues from the printed report on a cool slate neutral ramp, with four state colours and a separate always-dark light box. Tokens are stored as RGB triplets in `src/styles/global.css` (light under `:root`, dark under `.dark`) so Tailwind's `/alpha` modifiers work in both themes; the hex values here are the same colours.

### Primary
- **Letterhead Navy** (`brand` #0F2C59; dark #3B6FE0): the department's own colour. Fills the primary button (Approve & download, Re-queue, Retry, Generate with AI), the brand mark, the numbered step discs of the first-run screen, the toast action button, the navy cell of the letterhead stripe and the impression card's left rule. Primary fills run from brand down to brand-lo.
- **Brand Low** (`brand-lo` #0A1F40; dark #2C5CC8): the lower stop of the lit navy gradient on primary fills, the step discs and the toast action. It only ever darkens the brand, so white labels keep AA in both themes.
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
- **Surface** (`surface` #FFFFFF; dark #101622): the tint of every glass surface (sidebar, header, bars, dialogs, drawer, menus, toasts), and solid for the audit panel, secondary buttons and inputs.
- **Surface 2 / Surface 3** (`surface-2` #F6F8FB, `surface-3` #EDF1F6): input fill and dialog footers; hover fill, segmented track, neutral chips, the token badge.
- **Hairline / Strong Line** (`line` #E1E7EF, `line-strong` #CBD5E1): all 1px separators and borders; strong line for secondary-button borders, dashed drop zones and scrollbar thumbs.
- **Ink, Ink 2, Muted, Faint** (`ink` #0F172A, `ink-2` #334155, `muted` #546277, `faint` #677487): headings and values; body and control text; secondary text, labels, placeholders; tertiary metadata and separators.
- **Sheet, Sheet Ink, Sheet Line, Sheet Tint** (`sheet` #FFFFFF, `sheet-ink` #0F172A, `sheet-line` #E2E8F0, `sheet-tint` #F1F5F9): the report twin's own paper palette, mapped from the print template's white page, slate text, #E2E8F0 rules and #F1F5F9 organ-chip fill. In dark mode the sheet becomes a dark paper (#131A27) rather than staying white.
- **Light Box** (`lightbox` #0A0E15; dark #05080D) with **Light Box Glass** (`lightbox-glass` #0C121C at 72% with a 14px blur): the note's backlit field, with a vignette to black at 45% and a cool 6% backlight; glass is the smoked zoom toolbar and the reading label over it.
- **Note Paper** (`note-paper` #FBFAF7): the warm off-white of the senior's handwritten note, used for the verbatim transcript page in the light box and the note in the first-run illustration. It stays light in both themes.

### Material (chrome only)
Values are light / dark; every one is a token in `src/styles/global.css`, and nothing printed uses them.
- **glass** (`glass-a` 0.70 / 0.62): static chrome over the glow (sidebar, header, phone top and tab bars), no blur.
- **glass-bar** (`glass-a` with `glass-blur` blur(14px) saturate(1.6)): the section nav and the phone bottom bar, where content moves behind.
- **glass-float** (`glass-float-a` 0.82 / 0.78 with `glass-float-blur` blur(20px) saturate(1.7)): menus, the region popover and toasts. Tooltips use ink at the same alpha and blur (`glass-ink`).
- **glass-panel** (`glass-panel-a` 0.88 / 0.84, never blurred): dialogs, the drawer and the drop card; the scrim already blurs.
- **glass-dark** (rgb(12 18 28) at 0.72 with `glass-blur`): the light-box controls, the same in both themes.
- **Edge light** (`glass-edge` white at 0.70 / 0.07): the 1px top edge light.
- **Brand glow** (`glow-1` cobalt 37 99 235 at 0.22 / 59 111 224 at 0.26; `glow-2` navy 15 44 89 at 0.12 / periwinkle 125 164 250 at 0.10): the static glow, top-left.
- **Shimmer** (`shimmer` 147 197 253 / 191 219 254): the light on the one enabled next-step primary.
- **Scrim** (`scrim` 15 23 42 at 0.30 / 2 4 8 at 0.55, with blur(4px) saturate(1.1)).
- **Desk light** (`desk-light` white at 0.85 / 125 164 250 at 0.07): the lamp glow on the canvas around the letterhead.
- **Paper glow** (`paper-glow` 37 99 235 at 0.16 / 59 111 224 at 0.22) and **paper edge** (`paper-edge` white at 0 / 0.06): the cobalt pool under the sheet and the dark paper's top edge light.

Under prefers-reduced-transparency, prefers-contrast: more or forced-colors, every alpha goes to 1 (glass-dark to 0.95), the blurs to none, the scrim to 0.45 / 0.60 and the glow to 0.

### Named Rules
**The Printed Pair Rule.** Navy and cobalt keep the jobs they have on the PDF. Navy is authority: the department, the headings, the one action that issues the report. Cobalt is the working line: rules, bullets, focus, the AI's live state. Do not swap them, and do not add a third brand hue.

**The One Colour Per State Rule.** Queued and Generating are cobalt, Draft is neutral, Blocked is amber, Failed is red, Finalized is green, Archived is neutral and muted. The same mapping is used in the chip, the banner and the toast for that state.

**The Red Is For Failure Rule.** Red marks a failure (generation, save, load) and the urgent clinical notification. It is never decoration, emphasis or a hover colour.

**The Light Box Stays Dark Rule.** The note viewer is near-black in both themes, its controls are white at 6 to 15% alpha (segmented, on-dark buttons) or smoked glass rgb(12 18 28/.72) with a white 8% top rim (zoom pill, reading label), with slate text, and the paper inside it keeps its own colour. Never theme the light box. Depth is allowed: a vignette to rgb(0 0 0/.45), a cool backlight of at most 6% rgb(170 195 255) that may drift with the pointer, and the note shadow's backlight bleed. The centre never rises above about #141923, and the field itself never animates.

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

- **Case queue**, left, 304px, collapsible with `[` (a 280ms View Transition: the queue slides out as the workspace glides wider; instant without support or under reduced motion). Open by default from 1280px; below that a first visit starts with it closed, and a stored choice always wins. Brand bar 56px, intake (drop zone, sync, engine status), search, an Active/Archived segmented switch, the scrolling case list, and a 48px footer with the theme switch.
- **Header**, 56px, across the working area: patient name, token, details, status chip, save state on the left; Create Report, the AI action, Audit sheet, Print preview, focus toggle and the overflow menu on the right, with **Approve & download** always the last, top-right item. Action labels show when the header itself is at least 92rem wide (the `bar-wide` container variant, so an open queue counts); below that they are icon buttons with tooltips, so the bar never wraps and the patient name is never crushed.
- **Note light box**, centre, a resizable panel (default 42%, 52% from 1920px because the sheet is capped at 52rem; minimum 15rem) that collapses to 0 for focus mode (`F`). Focus mode uses the same transition: the report widens over the note and the sheet glides to centre, never stretched.
- **Report pane**, right (minimum 26rem), on canvas: a sticky 44px section nav (Patient, Technique, Findings, Impression, plus the urgent toggle) on frosted canvas glass (70%, 14px blur), with a 12px shadow that fades in over the first 32px of scroll, then the state banner, the sheet and the unprinted Notes for the AI, all centred at a 52rem maximum.

The split handle is a 1px hairline with a widened invisible hit area that turns cobalt on hover, focus and drag.

Below 1024px the queue becomes a left drawer (min(88vw, 22rem)) with a close button and Create Report beside the photo intake; the working area becomes a Report/Note segmented tab bar. The Report and Note panes both stay mounted; switching crossfades with a 16px slide (220ms) and keeps scroll, zoom and rotation. Below 640px a bottom action bar holds the AI action and a large Approve & download, padded for the safe area; it never overflows down to 320px (the AI action goes icon-only and labels truncate). The bottom action bar is frosted glass over the report; on the Note tab it sits below the light box. Below 640px dialogs become bottom sheets with full-width, wrapping footer buttons. Touch and pen pointers (the `coarse` variant) get 44px minimum targets, 16px inputs and a compact one-row intake (camera, gallery, typed), and hover-revealed controls are always visible. Short desktops (the `short` variant, at most 800px tall) compact the drop zone so the case list keeps its rows.

Panes lay themselves out by their own width, not the viewport's, through container-query variants: `pane-wide` (report pane at 36rem), `bar-wide` (header at 92rem) and `note-wide` (light box at 22rem). The sheet is a size container too: the `wide` variant switches at 32rem of sheet width and `roomy-sheet` at 42rem. Wide: 40px side gutter, 4-column meta grid, finding rows in three columns (1.5rem marker, 11rem structure, text) and the full letterhead with the faculty line. Roomy: the two-column sign-off and the roomier meta grid and finding rows, so labels never break ragged. Narrow: 16px gutter, 2-column meta grid, structure stacked above its text.

Spacing runs on a 4px base. Recurring steps: 2px between list rows, 8 and 12px inside controls, 16 to 20px panel padding (dialog headers and footers use 20px horizontal), 28px between sheet sections, 40px sheet gutter when wide.

## Elevation & Depth

Chrome is glass layered by translucency over a static brand glow, with a 1px top edge light and 1px hairlines doing the separation. The report sheet is the one lifted object in the working view, a sheet of paper with a soft long shadow and a hairline ring. Overlays (dialogs, menus, panels, drawers, toasts) use the large shadow. Every shadow is a soft ambient drop computed from a theme shadow colour: slate at low alpha in light mode, black at much higher alpha in dark mode so it still reads. Inside the light box the note paper floats on the note shadow: a contact shadow, a deep drop and a faint cool backlight bleed.

### Shadow Vocabulary
- **Hairline lift** (`xs`): secondary buttons, the active segment and section pill, the drop-zone icon disc, the Notes for the AI panel. Includes the inset edge light.
- **Edge** (`edge`): the 1px top light alone, for chips, banners and the selected row.
- **Primary** (`primary`): a white 16% top rim plus a cobalt glow under navy fills, replacing `sm` on primaries.
- **Tooltip** (`md`): tooltips.
- **Overlay** (`lg`): dialogs, menus, side panels, the queue drawer, toasts, the drop overlay card. Includes the inset edge light.
- **Paper** (`sheet`): a contact shadow, a long soft drop, a cobalt paper glow beneath and, on dark paper, an inset top edge light; always with the 1px sheet-line ring at 70%. The report sheet and its skeleton.
- **Note** (`note`): light-box paper with backlight bleed.
- **Scrim**: dialogs and the queue drawer dim the workspace with a static 4px backdrop blur; only opacity animates.
- **Bar lift**: a 12px shadow under the section nav that fades in over the first 32px of scroll.

### Named Rules
**The One Paper Rule.** Only the report sheet (and the note paper in the light box) carries a drop shadow at rest; glass chrome uses translucency and the edge light instead, and floating overlays keep the overlay shadow.

**The Glass Budget Rule.** backdrop-filter is used only where something moves behind a small surface: the section nav and phone bottom bar (glass-bar, 14px), menus, the region popover and toasts (glass-float, 20px), tooltips (glass-ink), the light-box zoom pill and reading label (glass-dark), and the modal scrim (4px). Static chrome over the glow (sidebar, header, phone top and tab bars) is translucent without blur. Surfaces over the scrim (dialogs, drawer, drop card) never blur a second time. The audit side panel is solid. Never on the report scroller, the sheet or a large panel. While a modal scrim is open, every CSS animation in the workspace pauses.

## Shapes

Two radius families. Chrome is gently rounded: 6px for skeleton bars, 8px for buttons, inputs, menu items, tooltips and keyboard hints, 12px for case rows, banners, menus and the segmented track, 16px for dialogs. Status chips, the zoom toolbar and the reading label are full pills. The document twin keeps the print template's tighter corners: 3px for editable fields and organ chips, 4px for the meta grid, impression card and critical box, 6px for the sheet itself. The letterhead stripe is a 3px bar split 70/30, navy then cobalt.

Borders are 1px hairlines everywhere. Dashed borders mean "drop or add here": the photo drop zone, the empty findings box, the Add region button, the drop overlay.

### Named Rules
**The Twin-Only Side Rule.** Exactly two elements carry a 4px left rule, and both live inside the document twin because they reproduce the PDF's own devices: the impression card (navy rule, from the print template's impression card) and the critical box (red rule, from its critical alert). App chrome never uses a side stripe: the selected case row is a full cobalt wash, state banners are full-border tints, and separators are full hairlines. A new sheet element may use a side rule only if the print template draws one there; a new chrome element never does.

## Components

### Buttons
Quiet, compact and tactile: buttons sink to 0.96 on press (90ms) and spring back on release on the pop spring (320ms, about 16% overshoot of the press depth); primary, secondary and danger lift 1px on hover for hover-capable pointers; 120ms colour transitions; a spinner that keeps the label so the button never changes width.
- **Shape:** gently curved (8px radius); 12px on the large size.
- **Primary:** lit navy: a brand to brand-lo vertical gradient, white text, 36px tall, 14px side padding, and the primary shadow (white top rim plus cobalt glow); hover brightness 1.08, press 0.95; disabled 50% with no glow. In the header the primary is always Approve & download (Download PDF once finalized). While it is disabled (50%, with a tooltip saying what is still needed), the state banner may carry the one other primary, the case's next step (Generate with AI, Re-queue, Retry). Only one primary is ever enabled at a time. The one enabled next-step primary carries the shimmer ring (see The One Shimmer Rule).
- **Secondary:** surface fill, strong-line border at 80%, ink-2 text, hairline shadow; hover fills surface-2 and darkens text to ink. The default variant.
- **Ghost:** no fill, ink-2 text, surface-3 on hover. Used for header actions and icon buttons.
- **On dark:** slate text with a 10% white hover, for controls over the light box.
- **Sizes:** 32px small, 36px default, 44px large (mobile bar, first-run). Icon-only buttons are 32 or 36px square, always named for assistive tech and explained by a tooltip with its shortcut.

### Status chips
- **Style:** full pill, 24px tall, 12px medium text with a 14px icon; fill and text from the One Colour Per State Rule. Each chip adds a same-hue 1px inset ring (the state colour at 20 to 25%; line-strong at 70% for Draft, line at 80% for Archived) and the top edge light.
- **State:** Queued shows a softly pulsing dot, Generating a spinning loader, Draft a pen, Blocked a question bubble, Failed a triangle, Finalized a badge check; Archived is a neutral chip that overrides the state.
- **Change:** on a real state change the fill eases to the new colour (180ms), the label rises 4px into place (200ms) and the icon pops on the pop spring; the width snaps; nothing animates on mount.

### Cards / Containers
- **Corner Style:** 12px for chrome containers (banners, Notes for the AI, audit lists); 4px for containers inside the sheet.
- **Background:** surface for neutral containers; a state wash for banners.
- **Shadow Strategy:** flat; banners and chips carry only the 1px edge light, and the Notes for the AI panel keeps the hairline lift (see Elevation & Depth).
- **Border:** 1px hairline; banners use their state colour at 20 to 25% for the full border.
- **Internal Padding:** 12px by 16px for banners, 14px by 16px for panels.

### State banner
The case's next step, above the sheet. Icon, title, a short body and at most two small buttons; tones are neutral, info, warning, danger and success, each a full-border tint with the icon in the state colour. Processing shows a live elapsed timer in cobalt. It slides in from above over 220ms, together with the sheet. Tones render as lit tiles: the state wash fading to 70% from top to bottom, with the top edge light.

### Inputs / Fields
- **Style:** chrome inputs are 36px, surface-2 fill (surface at 60% where the input sits on glass, as the queue search does), 1px hairline border, 8px radius, muted placeholder; hover strengthens the border.
- **Focus:** cobalt border, surface fill and a 2px cobalt ring at 20%. Everything else focusable gets a 2px cobalt outline at 2px offset.
- **Sheet fields:** read as printed text at rest, with no border and no fill. Hover gives a 55% cobalt wash; focus gives the sheet colour and a 2px cobalt ring at 50%. Text areas grow with their content and never scroll internally. Read-only (finalized or archived) fields keep the printed look with no hover.

### Navigation
- **Case list:** rows of name plus status chip over token, study and date. Hover fills surface at 75% with a hairline inset ring; the selected row is a full cobalt wash with a cobalt inset ring at 25% and the top edge light, which glides between rows on the layout spring (300ms, no bounce); name and token in navy ink. Arrow keys move between rows, `j`/`k` move the selection, `/` focuses search. A generating case shows a thin indeterminate cobalt bar along its bottom edge. Archive and restore appear on hover. New rows fade down 6px; leaving rows fade and shrink to 0.98 (150ms) while the rest close the gap; a status-only poll moves nothing. When the AI finishes a case, its row gets one cobalt sweep (900ms): the Generating colour leaving the row. Switching Active/Archived slides the list 12px from the chosen side (220ms).
- **Segmented control:** surface-3 track at 75% with a hairline inset ring, 28px segments (36px on touch), the active segment a surface pill with a hairline shadow that slides between options on a spring with no bounce (300ms). A dark tone exists for the light box.
- **Section nav:** the same sliding pill, on frosted canvas glass, driven by scroll position over the sheet; a click sends the pill straight to the target and holds it until the smooth scroll ends.

### Report sheet (signature)
The live twin. A white (or dark-paper) sheet up to 52rem wide carrying, in order: the letterhead (both crests, department in navy ink at weight 900, hospital line, faculty line when wide) over the 70/30 navy/cobalt stripe; the meta grid (hairline-separated cells, uppercase muted labels over 15px semibold values, the token in navy mono, unknown values left empty with a "Not stated" placeholder); Technique; the critical box when the case is marked urgent; Findings as organ-region chips with marker-led rows, where the marker is a cobalt dot for a normal statement and a larger amber dot with an amber row wash for an abnormal finding; the impression card with numbered points and a hairline-divided Recommendations block; and the printed sign-off and footer, so the twin ends where the page ends. Removing a region or finding offers Undo in a toast.

**The Untouched Print Rule.** Effects may frame the sheet (its shadow and paper glow, the desk light on the canvas around it, its entrance, an outer cobalt halo while it develops), and the develop reveal may move and fade its sections. Nothing restyles the letterhead, stripe, meta grid, findings, impression, critical box or sign-off: no glass, gradient, glow or blur on printed content, and no overshoot inside the sheet. The print template does not load global.css.

### Impression card and critical box
- **Impression card:** 4px corners, sheet-line border with the 4px navy left rule, sheet-tint fill at 45%, 14px by 16px padding (20px from sm). "Impression" in navy ink, Recommendations in cobalt.
- **Critical box:** 4px corners, red border at 25% with the 4px red left rule, red wash at 70%, the urgent findings in bold red and the call log in italic red at 85%. It fades in with a 4px rise (220ms) when the case is marked urgent, the nav siren rings once (320ms), and it scrolls into view if it opened below the fold; clearing removes it at once. It states that it prints only once the urgent findings are filled in.

### Note light box (signature)
The note on its dark field, zoomable from 60% to 800%, rotatable in quarter turns, with a smoked-glass pill toolbar (rgb(12 18 28/.72), 14px blur, white 8% top rim) (zoom out, fit percentage, zoom in, rotate) at the bottom and a Scan/Transcript segmented switch on top. The transcript is a note-paper page with a navy uppercase heading. A Create Report case has no photo: its typed findings sit on a centred note-paper page with the study line, without the Scan/Transcript switch or rotation. While the AI reads, a cobalt scan beam a third of the paper's height sweeps top to bottom on a 2.6s loop, with carriage ticks at both paper edges and a faint afterglow. It fades in over 200ms and out over 300ms as the report starts to develop, and runs over typed findings too. Hidden under reduced motion. The field has a vignette and a cool 6% backlight. With a mouse, the backlight drifts up to 14 by 10px opposite the pointer on an overdamped spring, never while panning and never on touch or pen; the paper and its controls never move or tilt. Rotation always turns a quarter clockwise. A new note fades in from 98.5% scale once its image has loaded.

### Motion
One vocabulary: `src/lib/motion.ts` for motion/react, CSS variables in `global.css`, Tailwind `ease-*` and `duration-*`. Easings: `--ease-out` cubic-bezier(0.16,1,0.3,1) for arrivals; `--ease-standard` (0.2,0,0,1) for state changes; `--ease-in` (0.4,0,1,1) for exits; `--ease-in-out` (0.45,0,0.55,1) for loops; `--ease-spring`, the pop spring (stiffness 784, damping 28, mass 1: about 16% overshoot, settled by 320ms) written as a CSS linear() curve. Durations: 120 fast, 180 base, 260 slow, 220 enter, 150 exit, 280 panel. Interactions never exceed 320ms; signature moments last at most 900ms. Springs: layout (no bounce, 300ms) for pills, the selection wash and list moves; pop for press release, chip and icon pops, the brand mark's cobalt cell and the drop card; drift (stiffness 120, damping 20, mass 0.6, overdamped) for the light-box backlight.

Page load: a static shell (glass sidebar with the brand tile, glass header bar, brand glow) paints before JavaScript. The sidebar contents, then the header, section nav and sheet, rise in a 50ms cascade (6px over 420ms; the first sheet over 520ms), done by about 750ms and never replayed. Meanwhile the brand mark draws its four lines (420ms each, 70ms apart), pops its cobalt cell, sweeps a gloss and glows once, all within 900ms. The light box never animates in.

Case switch: the sheet enters 12px (260ms) and the header title 4px (200ms) in the direction of travel through the list; there is no exit. Lists: new cases fade down 6px; leaving cases fade and shrink to 0.98 (150ms) while the rest close the gap; a status-only poll moves nothing. Overlays: dialogs grow from 0.95 and rise 8px (240ms in, 150ms out) over a 4px-blurred scrim whose radius never animates; on phones they rise as bottom sheets. Menus, popovers and tooltips grow from their trigger using the Radix transform origin (160/120ms; tooltips 140ms, instant when skimming); the audit panel docks with a 32px slide (280/180ms); the drawer slides from its edge (300/200ms); closing surfaces never take clicks. Focus mode and sidebar collapse are 280ms View Transitions; the theme switch is a 320ms circular reveal from the switch.

Signature reveal: when a fresh draft lands on the open case, each section develops from a 6px blur and a 4px rise over 560ms, staggered 90ms; the stripe and section rules draw left to right over 640ms, the stripe's cobalt cell 240ms after the navy one; a cobalt halo breathes once around (never on) the paper; everything settles by 900ms. Ambient loops are limited to state: the queued dot's pulse, the processing bar, the skeleton shimmer, the scan beam, the drop target's float, and the shimmer on the one enabled primary. Every CSS animation in the workspace pauses while a modal scrim is open.

**The Compositor Rule.** Animate transform, opacity and filter only, never height, width or other layout properties. The critical box fades in with a 4px rise and leaves at once; finding rows appear and disappear in place. Layout (FLIP) animations pass layoutDependency so polls never measure. One-shot entrances use fill-mode backwards so finished animations release their layer. backdrop-filter follows The Glass Budget Rule.

**The Reduced Motion Contract.** Under prefers-reduced-motion, every tailwindcss-animate enter or exit becomes a plain fade (one global block keyed on `[class*=animate-in]` and `[class*=animate-out]`). Custom keyframes are motion-safe or live in a no-preference block. MotionConfig reducedMotion=user strips motion/react transforms and layout. Pointer springs check useReducedMotion(); smooth scrolls and View Transitions check prefersReducedMotion(). Loops stop, reveals fall back to a plain fade, and every element reaches its final state.

**The One Shimmer Rule.** A light runs round the 1px edge of the single enabled next-step primary only: Approve & download before issue (the header, or the phone bottom bar), otherwise the state-banner primary (Generate with AI, Re-queue, Retry). A 22% shimmer rim at rest, then a 900ms sweep every 6s, the first 1.2s after the button becomes enabled. Never when disabled or loading, never on Download PDF, never in dialogs, never on the sheet.

## Do's and Don'ts

### Do:
- **Do** treat the print template (`src/pages/print/[id].astro`) as the source of the sheet's look, and read institution text from `src/lib/institution.ts` so the twin and the PDF cannot drift.
- **Do** set printed text in `font-document` and on-screen text in Inter, per the Two Voices Rule.
- **Do** keep Approve & download as the single navy primary, top-right of the case header (bottom bar on phones), disabled with a reason until the case can be issued, and the only shimmering control while it is enabled and the case is not yet issued.
- **Do** mark selection with a full cobalt wash and state with full-border tints.
- **Do** express every state through the One Colour Per State mapping, in chip, banner and toast alike.
- **Do** use the semantic tokens (`bg-surface`, `text-muted`, `border-line`, `bg-accent-soft`) with alpha modifiers rather than raw palette colours, so both themes stay correct.
- **Do** gate every loop, reveal and transform per The Reduced Motion Contract, and give touch pointers 44px targets with hover-only controls always visible.
- **Do** leave unknown header values empty so they show "Not stated" on screen and print as "Not stated in source".

### Don't:
- **Don't** build a generic SaaS form-and-card editor: no field-by-field form beside a preview, no card grid of report sections, no second rendering of the report.
- **Don't** put a coloured side stripe on any chrome element (list rows, banners, toasts, panels); the 4px left rule belongs only to the impression card and critical box inside the twin.
- **Don't** use red for anything but failure and the urgent clinical notification.
- **Don't** theme the light box or let its white-alpha controls appear outside it.
- **Don't** use uppercase tracked labels in chrome; caps belong to text the PDF prints in caps.
- **Don't** add type sizes outside the eight-step scale or render anything below 12px.
- **Don't** add drop shadows to chrome at rest; glass chrome uses translucency and the 1px edge light, and only the paper, the note paper and floating overlays are lifted.
- **Don't** use overshoot outside the pop spring: it belongs to press release, chip and icon pops, the brand mark's cobalt cell and the drop card, never to layout, selection, pills, dialogs, panels or anything inside the sheet. No bouncing loops; the drop target floats smoothly.
- **Don't** put backdrop-filter on the report scroller, the sheet, a large panel, or a surface whose backdrop animates while it is open.
- **Don't** put glass, gradients, glows or blur on any printed element of the sheet; effects frame the paper from outside.
- **Don't** animate height, width or other layout properties; disclosures appear in place.
- **Don't** animate the light-box field itself; it is near-black from its first frame.
