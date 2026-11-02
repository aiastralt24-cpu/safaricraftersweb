# UI/UX audit — Species-led Storytelling

Evidence: `audit-ui-desktop.png`, `audit-ui-mobile.png` captured from `http://localhost:9090/concept` on 2026-09-07.

## Flow steps

1. Enter the section — needs work. The fixed black navigation masks the dossier masthead and active chapter, weakening orientation.
2. Understand the active destination — mixed. The image and headline are strong, but the story is too tall and the supporting copy too dense.
3. Browse destinations — needs work. The desktop rail is cramped; on mobile only three chapters are visible and horizontal scrolling is not signposted.
4. Continue to destination — needs work. The primary CTA is below the first viewport, so the section initially reads as editorial content without a clear next action.

## Highest-impact findings

- P1: The sticky site header covers the section's own header and chapter context when the section enters the viewport.
- P1: The mobile reading path places a large image and navigation rail before the headline and CTA, delaying meaning and action.
- P2: The narrow desktop chapter rail compresses destination names, while the adjacent next-image crop looks accidental rather than deliberately teased.
- P2: The active destination is repeated twice on mobile—once in the rail and again above the title—without adding useful context.
- P2: Important information and the CTA fall below the fold on both captured viewports.
- P2: Long season, habitat, and photography text behaves like database copy rather than a carefully edited luxury narrative.
- P2: Tiny uppercase labels and pale grey supporting text present legibility and contrast risks.
- P3: “Invitation only” and “private dossier” feel theatrical unless the service genuinely supports that promise.

## Recommended direction

Keep the photography, serif typography, limestone palette, and chapter concept. Remove the outer next-image strip; widen the text; reduce facts to short phrases; keep one compact destination rail; expose the CTA in the first desktop viewport; and on mobile place location + headline immediately after the image, moving the chapter rail below the summary. Offset the section for the fixed header or remove its redundant masthead.

## Evidence limits

The screenshots support layout, hierarchy, legibility, and visible affordance findings. Keyboard focus order, screen-reader announcements, touch swipe behavior, and contrast ratios require separate testing; this is not a full accessibility certification.
