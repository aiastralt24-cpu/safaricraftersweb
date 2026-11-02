# Safari Crafters typography audit

## Scope

Desktop first-view audit of `/concept`, `/destinations`, `/destinations/jawai`, `/journeys`, `/journal`, and `/store`, supported by live computed-style measurements. The public marketing experience was reviewed; admin and legal interfaces were not included.

## Overall verdict

The font pairing is appropriate: Cormorant Garamond supplies the editorial voice and Inter supplies utility/readability. The problem is scale governance. Six representative pages contain 231 visible elements below 14px; many labels resolve around 9.9–10.2px. At the other extreme, headings range from 57px to almost 90px in the captured views, while CSS permits headings above 140px. Local page styles frequently bypass the global type classes.

## Recommended type system

| Role | Desktop | Mobile | Line height | Use |
|---|---:|---:|---:|---|
| Display / campaign | 72–88px | 48–58px | 0.92–0.98 | One statement per page only |
| Page H1 | 56–72px | 42–52px | 0.96–1.02 | Page title |
| Section H2 | 42–56px | 34–42px | 1.00–1.08 | Major sections |
| Card/feature H3 | 28–36px | 25–32px | 1.08–1.16 | Content titles |
| Intro / lead | 20–24px | 18–21px | 1.45–1.58 | Opening paragraph |
| Body large | 18px | 17px | 1.60–1.72 | Premium narrative copy |
| Body default | 16px | 16px | 1.60–1.72 | General copy |
| Body small | 14px | 14px | 1.50–1.62 | Secondary descriptions |
| Navigation / CTA | 12–13px | 12–13px | 1.2 | Uppercase, 0.12–0.18em tracking |
| Eyebrow / metadata | 12px | 12px | 1.3 | Never below 12px |
| Caption / credit | 12px | 12px | 1.45 | Lower contrast only when nonessential |

## Uniformity rules

1. Use only `--font-display` for H1–H3, quotations and short editorial statements. Never use it for long paragraphs or navigation.
2. Use `--font-body` for body, facts, labels, links, buttons, captions and forms.
3. No visitor-facing text below 12px. Important descriptive text should never be below 14px.
4. Cap display text at 88px. Reserve it for one moment per screen; secondary section headings cap at 56px.
5. Keep body lines between 45–68 characters; hero descriptions between 38–55 characters.
6. Uppercase text should use 12–13px and tracking no greater than 0.18em. Very small type plus 0.22em tracking is causing visibility problems.
7. Text over photography needs a stable dark overlay behind its entire text zone; body copy should render at roughly 80% white or stronger.
8. Use five shared responsive tokens for display, H1, H2, H3 and intro, plus fixed 18/16/14/12px body tokens. Remove page-specific headline clamps unless the design genuinely requires an exception.

## Page findings

1. Concept homepage — mixed. Hero scale is acceptable, but 36 visible elements fall below 12px and several sectional labels/facts resolve at 10.24px.
2. Destinations listing — needs work. The 72px H1 is balanced, but 41 visible elements fall below 12px; region notes around 9.92px are too small.
3. Destination detail — mixed. The 72px Jawai H1 works, but facts and numbered metadata around 9.92px are not comfortably readable.
4. Journeys listing — needs work. It has the worst small-text density: 54 elements below 12px. Category navigation and utility labels need an immediate increase.
5. Journal — mixed. Article titles around 29px are appropriate, but category navigation and global utility labels at roughly 10px weaken readability.
6. Store — needs work. The hero title is expressive, but numerous secondary headings approach 70–82px, so everything competes for display-level attention. Utility text also drops near 10–11px.

## Priority changes

- P1: Raise all 0.58–0.68rem visitor-facing text to at least 0.75rem (12px); raise descriptive text currently below 0.875rem to 0.875–1rem.
- P1: Normalize all page H1 and section H2 styles to the shared scale above.
- P1: Strengthen hero description contrast over variable photographs.
- P2: Reduce Store secondary headings from 70–82px toward 48–60px.
- P2: Reduce mobile display clamps above 4rem unless the phrase is extremely short.
- P2: Reduce uppercase tracking from 0.22em to 0.14–0.18em for labels longer than two words.
- P2: Consolidate duplicated type declarations in `concept.css`, `listing.css`, `detail.css`, `store.css`, `simple.css`, and `private-aviation.css` into shared tokens.

## Accessibility limits

Screenshots and computed styles support hierarchy, size, wrapping and visible-contrast risk findings. Exact WCAG contrast ratios, zoom reflow, keyboard focus and screen-reader semantics require separate automated and manual testing.
