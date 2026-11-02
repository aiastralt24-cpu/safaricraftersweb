# Safari Crafters website simplification audit

**Audit date:** 11 September 2026  
**Scope:** Public website, desktop (1440×900), large desktop (1728×1117), tablet (834×1112), and mobile (390×844), plus current source structure.  
**Primary lens:** An experienced, high-net-worth safari traveller who already understands wildlife travel and wants confidence, differentiation, and a fast path to the right conversation.

## Executive verdict

Safari Crafters already looks premium. The imagery, serif/sans pairing, restrained palette, and photographic point of view are among the strongest parts of the brand. The problem is not a lack of design. It is a lack of editorial hierarchy.

The visitor must currently interpret too many similarly weighted products, pages, poetic statements, and calls to action. On mobile, this becomes especially costly: the homepage runs for 12.4 screens, the guided-bespoke page for 13 screens, and a journey detail page for 16.6 screens. Nothing is horizontally broken, but the experience is cognitively heavy.

From an experienced safari traveller's perspective, the first questions are simple:

1. Do you design private journeys, hosted departures, or both?
2. What makes your field judgement better than another luxury operator's?
3. Which journeys are available now, for what dates, group size, and price level?
4. Who will personally plan or lead the journey?
5. What is the fastest way to speak to that person?

The current site answers these questions eventually, but not quickly enough. Its strongest commercial proof is dispersed across long pages. The result feels more like an editorial archive than a luxury travel decision system.

### Overall assessment

| Dimension | Assessment | Why |
|---|---:|---|
| Visual identity | 9/10 | Distinctive imagery, refined palette, recognisable editorial character. |
| Responsive execution | 8/10 | No horizontal overflow in tested core pages; compositions generally adapt cleanly. |
| Offer clarity | 4/10 | Private journeys, bespoke safaris, guided safaris, and photo expeditions overlap semantically. |
| Navigation | 4/10 | Eleven top-level menu items have almost equal visual weight. |
| Content discipline | 4/10 | Too many large editorial sections and repeated ideas; key facts appear too late. |
| Conversion flow | 5/10 | Many CTA labels and a private-only planner create ambiguity for shared departures. |
| Trust and authority | 7/10 | Strong people and field credentials exist, but they are not surfaced early enough. |
| Store scalability | 6/10 | Category and product routes now exist, but operational commerce fields and catalogue behaviours still need a second phase. |

## Evidence from the current build

### Page length and density

| Page | Desktop height | Mobile height | Mobile screens | Approx. words | Main issue |
|---|---:|---:|---:|---:|---|
| Homepage | 7,545 px | 10,453 px | 12.4 | 470 mobile | Too many major chapters before the final CTA. |
| Journeys | 4,016 px | 7,564 px | 9.0 | 285 mobile | Good visual system, but filters and category meaning take too long. |
| Journey detail | 9,349 px | 13,989 px | 16.6 | 1,030 mobile | Beautiful opening; excessive downstream narrative. |
| Guided bespoke safaris | 9,000 px | 10,991 px | 13.0 | 625 mobile | This is actually a private-guide service, not a distinct safari category. |
| Photo expeditions | 4,501 px | 6,404 px | 7.6 | 252 mobile | Clearest product page; still overuses filter space. |
| Destinations | 3,883 px | — | — | 204 desktop | Strong visual entrance, but generic copy and unclear next decision. |
| Jawai destination | 7,679 px | — | — | 556 desktop | Editorial depth is good, but the decision path is buried. |
| Private aviation | 6,925 px | — | — | 494 desktop | An enabling service is given the weight of a core product. |
| About | 5,081 px | — | — | — | Strong atmosphere; leadership authority appears after a generic first screen. |
| Plan | 1,996 px | 3,397 px | 4.0 | 150 mobile | Best-disciplined page, but framed as private-only and starts with geography. |
| Journal | 6,000 px | — | — | 534 desktop | Too many articles and links presented at once. |
| Conservation | 6,888 px | — | — | 441 desktop | Long, persuasive story with no onward conversion route. |
| Guest notes | 2,816 px | — | — | 147 desktop | Concise, but underused as proof in the main decision path. |
| Contact | 2,472 px | — | — | 113 desktop | Appropriate length; secondary to the planner. |

### Device findings

- **Mobile:** responsive in the technical sense, but not in the editorial sense. Sections stack cleanly yet retain desktop-sized narrative ambition. A visitor must scroll through 12–17 screens on key pages.
- **Tablet:** the planner is visually strong, but large headings and the left editorial rail consume space that should help the visitor make the next choice.
- **Large desktop:** additional width becomes atmosphere and whitespace rather than faster comprehension. The offer remains poetic and indirect.
- **Menu:** all eleven entries fit, but they are ungrouped and nearly equal in emphasis. This forces the visitor to understand Safari Crafters' internal taxonomy before choosing.

### Screenshot evidence

- [Homepage, desktop](./01-home-desktop.png)
- [Menu, desktop](./02-menu-desktop.png)
- [Homepage, mobile](./20-home-mobile.png)
- [Menu, mobile](./26-menu-mobile-current.png)
- [Journeys, desktop](./05-journeys-desktop.png)
- [Journey detail, mobile](./22-journey-detail-mobile.png)
- [Guided bespoke safaris, desktop](./08-bespoke-safaris-desktop.png)
- [Photo expeditions, desktop](./09-photo-expeditions-desktop.png)
- [Private aviation, desktop](./10-private-aviation-desktop.png)
- [Plan, tablet](./28-plan-tablet.png)
- [Homepage, large desktop](./29-home-large-desktop.png)
- [Journey detail, large desktop](./30-journey-detail-large-desktop.png)

## The core structural problem

The current public taxonomy is:

- Journeys
- Bespoke Safaris
- Photo Expeditions
- Destinations
- Private Aviation

The visitor has to infer that:

- Journeys are private and tailormade.
- Bespoke Safaris are also private journeys, but with a Safari Crafters guide added.
- Photo Expeditions are fixed-date small-group departures.
- There is no clearly presented hosted small-group safari for a traveller who wants field leadership but is not primarily a photographer.
- Private Aviation is a routing option, not another reason to travel.

This is why the site feels complicated even where individual pages are attractive.

## Recommended product architecture

Use four explicit offers. Do not ask the visitor to decode the difference.

### 1. Private Tailor-Made Journeys

For couples, families, friends, and individuals. Fully private, custom dates, custom pace, and adaptable itinerary.

### 2. Hosted Small-Group Safaris

Fixed-date, non-private departures led by a Safari Crafters host or specialist. The core promise is shared field access, informed leadership, and a carefully selected group—not photography tuition.

Do **not** call this “non-private bespoke.” Bespoke implies individual tailoring and conflicts with a shared fixed departure. “Hosted Small-Group Safaris” is precise and premium.

### 3. Specialist Photo Expeditions

Fixed-date, photography-first departures with explicit group size, leader, skill level, equipment suitability, shooting conditions, and field access.

### 4. Private Guide Service

An optional service added to a private itinerary. Rename the current **Bespoke Safaris** page to **Travel With a Private Guide** or **Private Guide Service**. It should not appear as a peer to the three ways of travelling.

### Private aviation

Position private aviation as a service within relevant private journeys and the planning flow. Keep its standalone page for SEO and high-intent visitors, but remove it from the homepage's main narrative and primary menu. Show it contextually when it materially shortens difficult routing.

## Recommended navigation

### Primary header

1. Journeys
2. Destinations
3. Scheduled Departures
4. Journal
5. About
6. **Plan a Safari** — persistent primary CTA

### Journeys menu

- Private Tailor-Made Journeys
- Travel With a Private Guide

### Scheduled Departures menu

- Hosted Small-Group Safaris
- Photo Expeditions
- Departure Calendar

### Footer / secondary navigation

- Guest Notes
- Conservation
- Private Aviation
- Store
- Contact
- Legal

The full-screen menu can remain as a brand expression, but it should be grouped by intent rather than numbered as eleven equal destinations. The user should see “How do you want to travel?” before the company asks which content page they want.

## Recommended homepage

Target: **5–6 desktop screens and 7–8 mobile screens**, with approximately **220–300 visible words**.

### 1. Hero: orient before inspiring

Current: “In pursuit of stillness.” This is emotionally strong but does not tell a first-time visitor what Safari Crafters sells.

Recommended structure:

> Private and small-group wildlife journeys, shaped by people who know the field.

Supporting line:

> Tailor-made safaris, hosted departures and specialist photography journeys across India and the world's great wildlife landscapes.

Primary CTA: **Find your journey**  
Secondary CTA: **View scheduled departures**

Keep the poetic line as a film caption or brand signature, not the sole value proposition.

### 2. Choose how to travel

Three compact cards only:

- Private Tailor-Made
- Hosted Small-Group
- Photo Expeditions

Each card should answer: who it is for, whether dates are fixed, whether it is private, and the maximum group size where applicable.

### 3. Featured journeys and departures

Show three choices—not multiple carousels and rails:

- One flagship private itinerary
- The next hosted small-group safari
- The next photo expedition

Each card gets destination, date or season, duration, travel style, and one CTA.

### 4. Why Safari Crafters

Use three proof points:

- Field judgement: specialists who understand animal behaviour and seasons
- End-to-end planning: route, access, camps, guides, transfers, and contingencies
- Deliberate scale: private journeys and genuinely small hosted groups

Add one guest quote and a link to all Guest Notes. Social proof should work here, not on an isolated page only.

### 5. Destination entry

Four regional cards: India, Africa, The Americas, Arctic & Beyond. Each card should say what the region is best for and the ideal travel window.

### 6. Final planning CTA

> Tell us how you want to travel. We will recommend the right journey and the right person to plan it.

Primary CTA: **Start your safari brief**  
Secondary CTA: **Speak to a specialist**

### Remove or relocate from homepage

- Remove the full private-aviation chapter.
- Remove one of the two large private-journey/editorial showcases.
- Avoid a second photographic salon after photo expeditions have already been introduced.
- Keep only one substantial scroll-expansion image moment.
- Move deep conservation storytelling to the Conservation page and use one proof statement on home.

## Page-by-page change plan

### Global header and menu

**Keep:** transparent cinematic header, logo, plan CTA, full-screen treatment.  
**Change:** reduce or group top-level choices; stop presenting eleven equal items; use plain product labels.  
**Mobile:** keep all primary choices within the first viewport; utility links can follow in a smaller list.  
**Success criterion:** a new visitor can identify private, hosted group, and photo options in under ten seconds.

### Footer

**Keep:** brand statement and contact/social access.  
**Change:** reduce duplicate link columns. Use three groups: Travel, Discover, Company.  
**CTA:** change “Begin a Private Journey” to **Plan a Safari**, so the footer does not exclude hosted-departure visitors.

### Homepage

**Keep:** hero imagery, visual tone, field-led positioning, one scroll-expansion signature moment.  
**Change:** use the six-section sequence above; cut visible copy by roughly 40%; remove private aviation from the main sequence; add hosted small-group safaris.  
**CTA:** one primary action per section.  
**Success criterion:** users reach a relevant product family in two taps or fewer.

### Journeys listing

**Keep:** strong hero and atlas-style cards.  
**Change:** make this explicitly the **Private Tailor-Made Journeys** collection. Replace abstract filters with useful high-intent facets: Region, Wildlife, Ideal Month, Duration, and Pace.  
**Mobile:** use a single **Filter** button opening a bottom sheet; show active-filter count. Do not spend the first quarter-screen on chips.  
**Card facts:** route, suggested length, best season, private/customisable label.  
**Success criterion:** a visitor can compare three journeys without opening each detail page.

### Journey detail

**Keep:** excellent hero, fact ledger, anchoring navigation, imagery.  
**Change:** reduce visible copy to 350–550 words. Put the day-by-day itinerary, detailed field notes, inclusions, and FAQs behind clear accordions. Retain critical facts in the open state.  
**New order:** hero/facts → five highlights → route map/summary → accommodation → concise day-by-day → specialist → practical details → plan CTA.  
**CTA:** sticky mobile action after the hero: **Plan this journey**. Secondary: **Download itinerary**.  
**Remove:** repeated philosophical statements that do not alter the purchase decision.  
**Success criterion:** duration, route, ideal season, style, and next action are visible within one mobile screen after the hero.

### Destinations hub

**Keep:** cinematic geographic entry.  
**Change:** add a plain opening sentence that says the page helps choose the right landscape. Lead with region, season, signature wildlife, and trip style.  
**Filters:** Region, Wildlife, Best Month. Avoid descriptive fragments being the primary comparison mechanism.  
**Success criterion:** a visitor who knows the month but not the destination can narrow the collection immediately.

### Destination detail

**Keep:** local storytelling and destination-specific imagery.  
**Change:** make “Why go / Best time / Signature wildlife / Ideal stay / Access” the first factual block. Limit visible editorial prose to 300–450 words; place deeper writing behind “Read the full field note.”  
**CTA:** **See journeys in [destination]** before **Plan [destination]**.  
**Success criterion:** inspiration and practical suitability are equally visible.

### Hosted Small-Group Safaris — new

This is the missing offer.

**Hub content:** what hosted means, group size, who leads, who it suits, fixed dates, and comparison with private travel and photo expeditions.  
**Departure cards:** location, dates, duration, group size, host, price from, availability state.  
**Detail content:** daily rhythm, host, accommodation, group profile, inclusions, physical level, single supplement, cancellation terms, and enquiry/booking state.  
**CTA:** **Check availability**.  
**Success criterion:** no visitor has to ask whether a departure is private, shared, or photography-led.

### Travel With a Private Guide — rename current Guided Bespoke Safaris

**Keep:** strong black-leopard hero and field-intelligence story.  
**Change:** state immediately that this is an add-on to a private journey. Reduce 13 mobile screens to approximately 7–8.  
**Recommended title:** “Add a Safari Crafters guide to your private journey.”  
**CTA:** **Plan with a private guide**.  
**Success criterion:** no overlap with Hosted Small-Group Safaris.

### Photo Expeditions

**Keep:** clear small-group and mentorship positioning; current page is the best-defined of the three product areas.  
**Change:** surface group size, leader, dates, skill level, vehicle occupancy, equipment assumptions, and price/availability in every card. Reduce filter height on mobile.  
**CTA:** **View expedition** or **Check availability**, not “Request details” everywhere.  
**Success criterion:** a serious photographer can qualify a departure from the listing card.

### Private Aviation

**Keep:** standalone page and premium operational story.  
**Change:** move out of primary navigation and homepage sequence. Shorten to: where it helps, sample routing, aircraft/partner standards, baggage constraints, and enquiry. Avoid presenting it as a separate travel philosophy.  
**Contextual use:** add “Private aviation available” only to journeys where it materially improves the route.  
**Success criterion:** aviation supports the safari rather than competing with it.

### Plan page

**Keep:** refined visual form, progressive steps, low-pressure tone.  
**Change first question:** “How would you like to travel?” with Private Tailor-Made, Hosted Small-Group, Photo Expedition, and Not Sure. Then ask destination.  
**Change title:** from “Private Safari Brief” to **Safari Brief**.  
**Progress:** show time expectation (“about 2 minutes”), allow Back at every step, and retain entered data.  
**Fast path:** returning/experienced travellers should be able to choose “Speak to a specialist” without completing six steps.  
**Success criterion:** all product types enter one routing system without being mislabeled private.

### About

**Keep:** new tiger hero, leadership portraits, ethical photography principle.  
**Change:** surface the three leaders immediately after a concise brand statement. Compress each biography to 80–120 visible words with an accessible Read more control. Put measurable authority—years in field, journeys led, countries, awards—beside the relevant person rather than in generic homepage counters.  
**Copy:** retain “The wild shaped each of us differently.” It is strong, specific, and human.  
**Success criterion:** the visitor knows who owns the experience and why they are credible within two screens.

### Journal

**Keep:** editorial role and field voice.  
**Change:** show six recent/featured pieces initially. Add topic filters only when useful: Field Notes, Photography, Conservation, Culture. Paginate or load more; do not show fifteen equal headlines at once.  
**Commercial bridge:** every article should end with one relevant destination or journey, not a generic footer only.  
**Success criterion:** the journal builds authority without becoming a navigation cul-de-sac.

### Guest Notes

**Keep:** short dedicated archive.  
**Change:** add filters only by travel style, not by destination unless volume justifies it. Pull the strongest one-line quotes into home and product pages.  
**Proof fields:** travel style, year, destination, and verified/permission state where appropriate.  
**Success criterion:** testimonials reduce risk at the moment of choice.

### Conservation

**Keep:** field-first tone and restrained visual treatment.  
**Change:** reduce narrative; present three concrete initiatives with location, partner, action, date, and outcome. Add sources or annual updates. End with relevant journeys and a contact route.  
**Success criterion:** the page demonstrates evidence, not only values.

### Store

The store must be treated as a retail system:

**Correct hierarchy:**

- `/store` — store landing and category discovery
- `/store/books` — Books category
- `/store/books/ghosts-of-the-granite-hills` — one product page
- `/store/[category]` — reusable future category route
- `/store/[category]/[product]` — reusable future product route

The claim that the book is “individually numbered and signed” has been removed from current store source. The current book is described as a 396-page clothbound hardcover.

**What is ready now:** category model, category collection page, product model, generic future category and product routes, and a featured-product mechanism.  
**What is not yet commerce-ready:** inventory/SKU, product variants, stock state, fulfilment region, shipping estimate, tax/currency behaviour, returns policy, related products, cart behaviour, and purchase analytics.  
**Next catalogue categories:** add only when inventory is real—for example Books, Prints, Field Equipment, or Editions. Do not show empty category placeholders.  
**Success criterion:** adding a second category and product requires data/content entry, not a new page architecture.

### Contact

**Keep:** concise structure.  
**Change:** distinguish general contact from planning; give existing bookings a separate route. Show response expectation and WhatsApp only if it is actively staffed.  
**Success criterion:** no traveller fills the wrong form.

### Search

Keep as a utility rather than a top-level destination. Results should label content type—Journey, Departure, Destination, Journal, Store—and never mix them without visible taxonomy.

## Content system

### Recommended visible-word budgets

| Template | Visible word target |
|---|---:|
| Homepage | 220–300 |
| Hub/listing page | 100–180 before the collection |
| Journey/departure detail | 350–550 before expandable details |
| Destination detail | 300–450 before deeper field notes |
| Service page | 250–400 |
| About | 300–450 plus expandable biographies |
| Conservation | 250–350 plus evidence cards |

### Read more policy

Use “Read more” for biographies, field notes, detailed day-by-day content, and optional context. Never hide the core value proposition, dates, group size, price guidance, inclusions, or next action. The current accessible component uses a real button with `aria-expanded` and is technically suitable across breakpoints.

### Typography

Use the existing global type ladder consistently. Limit each page to:

- one display role,
- one H1,
- H2 section headings,
- H3 card titles,
- body/intro,
- one label style.

Avoid custom font sizes for individual page moments unless they are part of an approved template. Keep body copy to approximately 60–68 characters per line; labels should not drop below 12 px. On mobile, prevent headlines from becoming the entire screen unless the next decision is still visible.

### Copy

Use poetry to create desire and plain language to create confidence. Every poetic headline needs an adjacent factual sentence. Remove duplicate claims around patience, stillness, light, and considered travel when the same idea has already appeared on the page.

## CTA system

Standardise around four actions:

- **Plan this journey** — private/custom itinerary
- **Check availability** — fixed-date hosted or photo departure
- **View journeys** — destination to product collection
- **Speak to a specialist** — direct high-intent route

Avoid using “Explore,” “Begin,” “Enquire privately,” “Request details,” “Speak with us,” and “Plan a journey” interchangeably. Luxury is not vagueness; the action should be unmistakable.

## Motion and performance

The current build has reduced-motion handling in the main animated templates, which is a strength. The remaining issue is editorial pacing.

During the local browser audit, Next.js also reported above-the-fold Largest Contentful Paint warnings for the Journeys, Guided Bespoke Safaris, and Photo Expeditions hero images. Those hero assets should be explicitly prioritised (`priority` or eager loading, as appropriate in the current Next.js version) and retested rather than assuming image optimisation alone is sufficient.

- Keep one signature scroll-expansion moment per long page.
- Use subtle reveal animation for hierarchy, not to delay content.
- Never require scroll-driven animation to understand dates, route, price, or CTA.
- Avoid multiple consecutive full-viewport image chapters.
- On mobile, use static crops or short lightweight video loops with a tested poster, muted autoplay, `playsInline`, and a fallback image.
- Measure page weight and Largest Contentful Paint for hero media before release.

## Accessibility checks

### Strengths

- No horizontal overflow was found in the tested core mobile pages.
- The menu button exposes `aria-expanded`.
- FAQ and expandable-text controls use real buttons and expansion state.
- Major motion modules check `prefers-reduced-motion`.
- A skip link exists globally.

### Improvements

- Verify the muted grey body text against the ivory background at WCAG AA contrast, particularly small labels and photo credits.
- Ensure all all-caps labels remain at least 12 px and are not the only carrier of meaning.
- Validate hero text contrast against every video/image frame, not only the poster frame.
- Keep visible keyboard focus on menu, filters, cards, accordions, and form choices.
- Announce filter-result counts and planner validation changes to assistive technology.
- Do not rely on hover to reveal the active journey; the current button/focus support is good and should be retained.

## Recommended visitor flows

### Visitor who knows how they want to travel

Home → Choose travel style → Compare journeys/departures → View facts → Plan or check availability

### Visitor who knows where or when

Home → Destinations → Filter by month/wildlife → Destination facts → Relevant journeys → Plan

### Experienced traveller who wants a human quickly

Header → Speak to a specialist → choose Private / Hosted / Photo / Not sure → contact details → callback

### Store visitor

Store → Category → Product → purchase/checkout

## Prioritised roadmap

### P0 — architecture and clarity (1–2 weeks)

1. Rename and separate the four offers.
2. Add Hosted Small-Group Safaris to the product model.
3. Rebuild the menu hierarchy and footer groups.
4. Reorder and shorten the homepage; remove the private-aviation chapter.
5. Change the planner's first question to travel style and remove private-only framing.
6. Standardise CTA labels.

### P1 — template simplification (2–4 weeks)

1. Reduce journey and destination detail visible copy.
2. Move supporting content into accessible accordions.
3. Redesign mobile filters as a bottom sheet.
4. Add comparison facts to all journey/departure cards.
5. Add hosted-departure hub and detail templates.
6. Surface leadership and guest proof earlier.

### P2 — authority and commerce depth (4–6 weeks)

1. Convert conservation claims into dated evidence cards.
2. Connect journal stories to relevant journeys.
3. Add commerce operations fields and analytics to the store model.
4. Add availability, pricing guidance, and specialist ownership to departure records.
5. Run moderated tests with five experienced safari travellers and three first-time luxury safari buyers.

## Acceptance criteria

- Six or fewer primary header choices plus one plan CTA.
- Three travel styles are visible on the homepage without scrolling past the first two sections.
- Homepage is no more than eight mobile screens before the footer.
- Journey detail is no more than eleven mobile screens with expandable supporting detail collapsed.
- Every fixed departure shows dates, duration, group size, leader, price guidance, and availability.
- Every page has one dominant CTA.
- Private aviation no longer precedes or visually outranks safari products.
- The planner accepts Private, Hosted Small-Group, Photo Expedition, and Not Sure.
- A second store category can be added without creating a new page component.
- Core pages pass keyboard review, reduced-motion review, and WCAG AA contrast checks.

## Benchmark notes

Current high-end operators make the travel model explicit. Abercrombie & Kent separates Tailormade Journeys, Small Group Journeys, Private Ready-to-Book, and private-jet products; its listing cards state duration and whether travel is private or limited to a guest count. &Beyond's current small-group photo product presents dates, duration, and group size near the top, while its tailormade products are framed separately. Micato's custom safari page makes privacy and personalisation the primary distinction.

Safari Crafters does not need to imitate their visual language. It should adopt their clarity of commercial taxonomy while preserving its more intimate, field-led identity.

## Research limitation

This was not a primary interview panel with live UHNI or experienced safari travellers. It is an expert heuristic review using the current Safari Crafters build, cross-device evidence, source inspection, and current public product structures from established luxury safari operators. The final P2 validation step should test the simplified prototype with real travellers before the full rollout.
