# Guided Bespoke Safaris — Specialists CTA Hide QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-6725d1f8-8005-4cb1-93de-b162d4c403a0.png`
- implementation: `http://127.0.0.1:3000/guided-bespoke-safaris`
- implementation screenshot: `/private/tmp/guided-specialists-cta-hidden-1440.png`
- combined comparison: `/private/tmp/guided-specialists-cta-hidden-comparison.jpg`
- source pixels: 668 × 280 at 144 dpi (cropped reference supplied by the user)
- implementation pixels and viewport: 1440 × 1000 at 1×; responsive verification also completed at 390 × 844 CSS px
- state: “Your field companion” section after reveal completion

## Full-view comparison evidence

The source crop identifies the “Meet our specialists” text CTA to be hidden. In the revised implementation the section retains its headline, supporting copy, portrait and caption, while the CTA and its underline no longer render.

## Focused-region comparison evidence

The combined comparison shows the supplied CTA above the revised complete section. Its former position now closes naturally beneath the paragraph without an empty placeholder, detached rule or altered two-column balance.

## Comparison history

- Initial finding: the requested temporary CTA remained visible in the guided-safari companion section (P2 content-state mismatch).
- Fix: placed the CTA behind a named local visibility switch set to false, preserving a one-line restoration path.
- Post-fix: the text is absent from the rendered document at desktop and mobile widths; no horizontal overflow is present.

## Required fidelity surfaces

- Fonts and typography: all remaining heading, body and caption treatments are unchanged.
- Spacing and layout rhythm: the hidden control contributes no residual height or divider.
- Colors and visual tokens: unchanged.
- Image quality and asset fidelity: the existing Gaurav portrait, crop and rounded frame are unchanged.
- Copy and content: only “Meet our specialists” is temporarily hidden; the Specialists route remains available.

## Findings

- No actionable P0, P1 or P2 issues remain.
- CTA absence and responsive overflow were checked in the in-app browser.

final result: passed

# Destination Field Notes — Design QA

- source state: previous live Laikipia chapter section captured at `http://localhost:9090/destinations/laikipia?audit=story-chapters`
- implementation: `http://localhost:9090/destinations/laikipia?qa=field-notes-final`
- viewports: desktop 1280 × 800 CSS px; mobile 390 × 844 CSS px
- interactions checked: chapter selection, image change, full-note expansion and responsive layout

## Comparison

The previous design rendered three near-identical image/text blocks measuring approximately 581–984 px each. Two chapters exposed 723 and 916 characters immediately, producing an uneven and text-heavy middle page.

The redesigned shared section presents one photo-led chapter at a time. Three compact selectors retain the original information architecture; the active panel shows a 58-word excerpt, with the full source copy available through an explicit expansion control. Images and copy crossfade on selection without sticky scrolling.

## Findings

- No P0, P1 or P2 visual issues remain.
- Desktop stage reduced to approximately 800 px for the longest default chapter.
- Mobile uses a 350 px-wide stacked stage with three compact selectors and no horizontal overflow.
- All three tab controls update selected state, image, title and copy.
- The full-note control expands the tested Laikipia chapter from 371 to 916 characters.
- Keyboard-friendly tab roles, focus states and arrow-key navigation are present.
- Motion uses opacity and transform only and is removed under `prefers-reduced-motion`.
- `npm run build` passes for all 162 generated pages.

final result: passed

# Specialists — Kairav Profile Removal QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-91a980ae-feeb-47fb-b4a3-894e6af0113a.png`
- implementation: `http://127.0.0.1:3000/specialists`
- implementation screenshots: `/private/tmp/specialists-without-kairav-1440.jpg`, `/private/tmp/specialists-without-kairav-390.jpg`
- combined comparison: `/private/tmp/specialists-kairav-removal-comparison.jpg`
- source pixels: 2694 × 1168 (provided display capture; CSS viewport and density unavailable)
- implementation viewports: 1440 × 1000 and 390 × 844 CSS px at 1× capture density
- state: specialist list with the first visible profile in view

## Full-view comparison evidence

The source showed the Kairav Engineer founder profile as the first specialist. The revised page removes that entire visual block and advances Gaurav Ramnarayanan into the first-profile position without leaving a reserved gap or an orphaned divider.

## Focused-region comparison evidence

At 1440 px, Gaurav's portrait, title, biography, journeys and CTA form the opening specialist row, followed directly by the Naturalist Network section. At 390 px the same content stacks cleanly, preserves the existing reading order and introduces no horizontal overflow.

## Comparison history

- Initial finding: Kairav's profile was present on `/specialists` despite the requested page content scope (P2 content mismatch).
- Fix: filtered Kairav from the page's visible specialist collection and from the page's Person JSON-LD, while retaining the shared source data for other website contexts.
- Post-fix: Kairav's profile, CTA and structured profile metadata are absent from `/specialists`; the remaining profile sequence closes cleanly.

## Required fidelity surfaces

- Fonts and typography: unchanged.
- Spacing and layout rhythm: the removed row leaves no empty placeholder; the remaining section rhythm is preserved.
- Colors and visual tokens: unchanged.
- Image quality and asset fidelity: the remaining Gaurav image and crop are unchanged.
- Copy and content: only the Kairav specialist entry and its page-level structured data were removed from this route.

## Findings

- No actionable P0, P1 or P2 issues remain.
- Desktop and mobile responsive structure, horizontal overflow, CTA removal and browser console errors were checked.

final result: passed

# Guided Bespoke Safaris — Field Story Cards QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-e63b43c3-9a9b-4a7f-93b1-7b19b917b8f0.png`
- implementation: `http://127.0.0.1:3000/guided-bespoke-safaris`
- implementation screenshot: `/private/tmp/guided-field-grid-aligned-1440.png`
- combined comparison: `/private/tmp/guided-field-grid-comparison.png`
- source pixels: 2984 × 1668 (provided display capture; CSS viewport and density unavailable)
- implementation viewports: 1440 × 1000, 1024 × 900 and 390 × 844 CSS px at 1× capture density
- state: three “Field intelligence” story cards visible

## Full-view comparison evidence

The source visibly staggered the second and third cards by 70 px and 140 px, making the imagery and its supporting copy appear stumbled. The revised implementation establishes a single top edge for all three image frames and a common content baseline beneath them.

## Focused-region comparison evidence

At 1440 px all three images begin at y=3113.57 and measure 414.72 × 518.40 px; labels, titles and body copy share their respective y positions. At 1024 px all images begin at y=2641.02 and measure 294.91 × 368.64 px. At 390 px the gallery remains a deliberate horizontal rail with equal 319.80 × 399.74 px cards and no page overflow.

## Comparison history

- Initial finding: independent vertical offsets made the card sequence look accidental and disconnected (P2).
- Fix: removed the second- and third-card top margins, aligned the grid at its start edge and gave every article a consistent column flow.
- Post-fix: all media, labels, titles and copy align across desktop and tablet; the compact mobile rail remains intact.

## Required fidelity surfaces

- Fonts and typography: existing display and utility type hierarchy is unchanged; corresponding text rows now align.
- Spacing and layout rhythm: stagger removed and all three card anatomies share one rhythm.
- Colors and visual tokens: existing bone, soil and brass palette is unchanged.
- Image quality and asset fidelity: original wildlife photographs, crops and rounded corners are retained.
- Copy and content: all approved field-story copy is retained verbatim.

## Findings

- No actionable P0, P1 or P2 issues remain.
- No horizontal overflow or browser console errors were found at the tested widths.

final result: passed

# Guided Bespoke Safaris — Introduction Alignment QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-99f33e77-3430-4638-adb8-650aacc77652.png`
- implementation: `http://127.0.0.1:3000/guided-bespoke-safaris#guided-introduction`
- implementation screenshots: `/private/tmp/guided-introduction-aligned-1440-final.png`, `/private/tmp/guided-introduction-aligned-1024.png`, `/private/tmp/guided-introduction-aligned-390.png`
- source pixels: 2934 × 1494 (provided display capture; CSS viewport and density unavailable)
- implementation viewports: 1440 × 1000, 1024 × 900 and 390 × 844 CSS px at 1× capture density
- state: introduction section in view after the page reveal animation

## Full-view comparison evidence

The source capture separated the eyebrow into a distant left column while the headline and two body columns began much farther across the canvas, making the section read as disconnected zones. The implementation places the eyebrow, headline and supporting copy inside one centred 1180 px editorial frame with a common left edge and a tighter vertical rhythm.

## Focused-region comparison evidence

The introduction was checked directly because typography and alignment are the complete scope of this change. The display face, brass eyebrow, bone canvas and muted body treatment are unchanged. At 1440 px the headline and first paragraph begin at x=130; both body columns begin at y=451. At 1024 px both body columns begin at y=349. At 390 px the content stacks on a single x=18 axis with no horizontal overflow.

## Comparison history

- First pass: the unified layout fixed the disconnected left label, but the 594 px headline measure created an unnecessarily tall four-line wrap (P2).
- Fix: widened the headline measure from 12ch to 15ch while retaining the shared alignment axis.
- Post-fix: the headline resolves as a balanced three-line statement at 1440 px, body copy retains equal columns, and tablet/mobile layouts remain overflow-free.

## Required fidelity surfaces

- Fonts and typography: existing display and body families, weights, tracking and hierarchy preserved; improved headline wrapping.
- Spacing and layout rhythm: detached grid removed; intro content centred; title-to-copy gap reduced; paragraph baselines aligned.
- Colors and visual tokens: existing bone, soil and brass tokens preserved.
- Image quality and asset fidelity: no image assets changed in this typography-only section.
- Copy and content: all approved copy preserved verbatim.

## Findings

- No actionable P0, P1 or P2 issues remain in the revised introduction.
- No horizontal overflow at 1440, 1024 or 390 CSS px.

final result: passed

# Regional Atlases — Design QA

- routes: `/destinations/india`, `/destinations/africa`, `/destinations/americas`, `/destinations/arctic-beyond`
- shared implementation: `RegionalAtlasPage`
- navigation checked: destinations hub, four footer Atlas links, country chapters, destination details and planning CTA

## Findings

- All four Atlas routes render from one shared template and resolve in the browser.
- Each page has one regional hero, editorial introduction, three visual lenses, featured places, country navigation, a uniform complete collection and a region-aware planning CTA.
- Sparse Arctic content remains intentional and includes the available Svalbard expedition.
- Destination summaries are consistently shortened in previews without changing the full destination source copy.
- Motion is reveal-once, transform/opacity only, non-sticky and removed under `prefers-reduced-motion`.
- Footer information architecture has no duplicate Guest Notes or individual journal-story links.
- TypeScript, whitespace validation and the production build pass for all 165 generated pages.

final result: passed

# Guided Bespoke Safaris — Field Heading Alignment QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-9171f33e-870f-4db4-add0-3e863fc05805.png`
- implementation: `http://127.0.0.1:3000/guided-bespoke-safaris`
- implementation screenshots: `/private/tmp/guided-field-aligned-1440-framed.png`, `/private/tmp/guided-field-aligned-1024-final.png`, `/private/tmp/guided-field-aligned-390-final.png`
- source pixels: 2948 × 518 (provided display capture; CSS viewport and density unavailable)
- implementation viewports: 1440 × 900, 1024 × 900 and 390 × 844 CSS px at 1× capture density
- state: “Field intelligence” heading and the opening row of field cards in view

## Full-view comparison evidence

The source spread the eyebrow, headline and supporting line across three distant columns, with the eyebrow bottom-aligned independently. The implementation consolidates the heading into a centred 1180 px frame: the eyebrow establishes the shared axis, then the two-line headline and supporting line form one balanced second row above the imagery.

## Focused-region comparison evidence

At 1440 px the heading frame spans x=130–1310. The title begins at x=130 and the supporting line occupies the balancing right column. At 1024 px both columns remain readable; at 390 px they stack in label/title/copy order on the same x=18 axis. No horizontal overflow is present.

## Comparison history

- First pass: unified the three detached areas, but a 10ch title measure produced an unnecessary three-line headline (P2).
- Fix: increased the title measure to 13ch and removed the eyebrow’s default bottom margin from the grid.
- Post-fix: the title resolves to two lines on desktop, grid baselines are balanced, and the mobile order remains natural.

## Required fidelity surfaces

- Fonts and typography: existing display and body type treatments retained; headline wrap improved.
- Spacing and layout rhythm: heading content centred, row gaps made explicit, and card transition tightened.
- Colors and visual tokens: existing bone, soil and brass tokens retained.
- Image quality and asset fidelity: existing field imagery and rounded crops retained unchanged.
- Copy and content: all approved text retained verbatim.

## Findings

- No actionable P0, P1 or P2 issues remain.
- Responsive checks show no horizontal overflow and no browser console errors.

final result: passed

# Guided Bespoke Safaris — Journey Choice Cards QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-8e07cbfd-8bab-40a8-b259-836097994b50.png`
- implementation: `http://127.0.0.1:3000/guided-bespoke-safaris`
- implementation screenshot: `/private/tmp/guided-paths-aligned-1440-framed.png`
- source pixels: 2984 × 1576 (provided display capture; CSS viewport and density unavailable)
- implementation viewports: 1440 × 1000, 1024 × 900 and 390 × 844 CSS px at 1× capture density
- state: journey and destination option cards visible after reveal animation

## Full-view comparison evidence

The source used different title heights, which pushed the destination paragraph and CTA below the matching journey content. The revised cards use a restrained common title scale, equal-height flex flow and bottom-aligned actions. At 1440 px both headings, paragraphs and actions begin on matching baselines.

## Focused-region comparison evidence

At 1440 px both titles are 41 px high and begin at y=4530; both descriptions begin at y=4586; both actions begin at y=4649. At 1024 px both title rows are 72 px high and both actions begin at y=702. At 390 px the cards stack naturally without a reserved desktop title height. No horizontal overflow was found.

## Comparison history

- Initial finding: mismatched headline wrapping produced visibly staggered copy and CTAs (P2).
- Fix: reduced the card-title scale, converted cards to equal-height column layouts, bottom-aligned CTAs and reserved equal title height only at narrow two-column widths.
- Post-fix: title, copy and action baselines match at desktop and laptop sizes; mobile remains compact.

## Required fidelity surfaces

- Fonts and typography: existing display face retained at a quieter scale; both desktop titles now remain on one line where space permits.
- Spacing and layout rhythm: card anatomy and CTA baselines now match; existing image proportions and rounded corners are retained.
- Colors and visual tokens: existing bone, soil and brass tokens are unchanged.
- Image quality and asset fidelity: both supplied local images, crops and rounded corners are unchanged.
- Copy and content: all approved card copy is retained verbatim.

## Findings

- No actionable P0, P1 or P2 issues remain.
- No horizontal overflow or browser console errors were found.

final result: passed

# Guided Bespoke Safaris — Hero Refinement QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-0402f03c-607a-40be-b8c4-8902ddb3b609.png`
- implementation: `http://127.0.0.1:3000/guided-bespoke-safaris`
- implementation screenshots: `/private/tmp/guided-hero-refined-1506.jpg`, `/private/tmp/guided-hero-refined-1024.jpg`, `/private/tmp/guided-hero-refined-390.jpg`
- combined comparison: `/private/tmp/guided-hero-refinement-comparison.jpg`
- source pixels: 3012 × 1662, normalized to 1506 × 831 CSS px at 1× for comparison
- implementation viewports: 1506 × 831, 1024 × 900 and 390 × 844 CSS px at 1× capture density
- state: page hero at initial load

## Full-view comparison evidence

The source used a hard two-panel split and a narrow headline measure, producing a heavy black slab and a three-line italic phrase while cropping much of the leopard. The refined implementation uses the original photograph as a full-bleed cinematic field, preserves a dark reading area with a graduated scrim, and restores the animal’s complete movement across the frame.

## Focused-region comparison evidence

At 1506 px the hero and media both measure 1506 × 831 px with no residual figure margins. The title resolves to two deliberate lines within a 536 px measure; the body remains 432 px wide and the CTA retains a 44 px interaction target. At 1024 px the same overlay composition remains legible. At 390 px the design switches to an image-first stack so the animal, headline and copy are not competing for the same narrow canvas.

## Comparison history

- Initial finding: hard panel boundary, oversized multi-line display copy and a portrait-like crop made the hero feel cramped and visually disconnected (P2).
- Fix: converted the image to a full-bleed layer, introduced a restrained directional scrim, reduced the display scale, kept the italic phrase together on desktop, corrected default figure margins and retained the mobile stacked composition.
- Post-fix: the hero reads as one continuous scene, the full animal is visible, the copy remains clear at all tested widths and no horizontal overflow or console errors remain.

## Required fidelity surfaces

- Fonts and typography: existing display and body families retained; headline scale, line height and wrapping now form a calmer two-line lockup on larger screens.
- Spacing and layout rhythm: hard split removed, figure margins normalized and copy constrained to a consistent reading zone.
- Colors and visual tokens: night, bone and brass tokens retained; the scrim uses neutral night-derived opacity rather than introducing a new palette.
- Image quality and asset fidelity: the supplied 2400 × 1150 source image is retained, with a wider crop that keeps the leopard’s tail, stride and environmental context legible.
- Copy and content: all approved hero copy and CTA language are unchanged.

## Findings

- No actionable P0, P1 or P2 issues remain.
- Primary CTA visibility, responsive structure, horizontal overflow and browser console errors were checked.

final result: passed

# Guided Bespoke Safaris — Two Paths Heading QA

- source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-0b73c316-8cb2-4238-9cde-c53290399f36.png`
- implementation: `http://127.0.0.1:3000/guided-bespoke-safaris`
- implementation screenshots: `/private/tmp/guided-paths-header-refined-1440.jpg`, `/private/tmp/guided-paths-header-refined-1024.jpg`, `/private/tmp/guided-paths-header-refined-390.jpg`
- combined comparison: `/private/tmp/guided-paths-header-comparison.jpg`
- source pixels: 2782 × 668 (provided display capture; CSS viewport and density unavailable)
- implementation viewports: 1440 × 1000, 1024 × 900 and 390 × 844 CSS px at 1× capture density
- state: “Two ways to begin” heading and opening journey-choice cards after reveal completion

## Full-view comparison evidence

The source placed the eyebrow in a narrow left track while the title began far across the canvas, creating a disconnected visual axis and excessive unused space. The revised header makes the eyebrow and headline one editorial unit and introduces the two image choices directly beneath it.

## Focused-region comparison evidence

At 1440 px the eyebrow and title share x=60.48. The title resolves to two balanced lines in a 772.91 px measure, and the card grid starts 60 px below the header. At 1024 px the shared left axis remains intact. At 390 px the title occupies the full 354 px content width and the cards stack without horizontal overflow.

## Comparison history

- Initial finding: the 0.55fr/1.45fr header grid separated the label and title by roughly 446 px and forced a narrow three-line headline (P2).
- Fix: replaced the split grid with a single 1040 px editorial column, aligned the eyebrow and title, widened the title measure and balanced its wrapping.
- Post-fix: the heading reads as a coherent introduction, the cards follow with a consistent 60 px desktop transition, and responsive layouts remain stable.

## Required fidelity surfaces

- Fonts and typography: existing display and utility faces retained; headline measure, scale, line height and wrapping refined.
- Spacing and layout rhythm: eyebrow and title now share one axis; gap to the card grid is consistent and purposeful.
- Colors and visual tokens: existing bone, soil and brass tokens are unchanged.
- Image quality and asset fidelity: both existing journey images, crops and rounded corners are unchanged.
- Copy and content: approved heading and card copy remain unchanged.

## Findings

- No actionable P0, P1 or P2 issues remain.
- Reveal completion, responsive structure, horizontal overflow and browser console errors were checked.

final result: passed
