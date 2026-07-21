from __future__ import annotations

from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/Safari_Crafters_Current_Project_State.pdf"

PAGE_W, PAGE_H = A4
MARGIN_X = 21 * mm
MARGIN_Y = 18 * mm

NIGHT = colors.HexColor("#100d0a")
NIGHT_DEEP = colors.HexColor("#0f0c09")
BONE = colors.HexColor("#f4f0e8")
IVORY = colors.HexColor("#e7dfcf")
PAPER = colors.HexColor("#fbfaf6")
INK = colors.HexColor("#11100e")
CHARCOAL = colors.HexColor("#292723")
MUTE = colors.HexColor("#706c61")
FOREST = colors.HexColor("#172216")
SAL = colors.HexColor("#3f5138")
BRASS = colors.HexColor("#9e7738")
BRASS_LIGHT = colors.HexColor("#d3ad69")
COPPER = colors.HexColor("#7c3f24")
WHITE = colors.white

FONT_SERIF = "Times-Roman"
FONT_SERIF_BOLD = "Times-Bold"
FONT_SANS = "Helvetica"
FONT_SANS_BOLD = "Helvetica-Bold"


def asset(path: str) -> str:
    return str(ROOT / path)


def image_box(path: str, width: float, height: float) -> Image:
    img = Image(asset(path))
    img._restrictSize(width, height)
    img.drawWidth = width
    img.drawHeight = height
    return img


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BONE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setStrokeColor(colors.Color(BRASS.red, BRASS.green, BRASS.blue, alpha=0.28))
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_X, PAGE_H - 13 * mm, PAGE_W - MARGIN_X, PAGE_H - 13 * mm)
    canvas.setFillColor(BRASS)
    canvas.setFont(FONT_SANS_BOLD, 6.5)
    canvas.drawString(MARGIN_X, PAGE_H - 10 * mm, "SAFARI CRAFTERS / CURRENT PROJECT STATE")
    canvas.setFillColor(MUTE)
    canvas.setFont(FONT_SANS, 6.5)
    canvas.drawRightString(PAGE_W - MARGIN_X, 10 * mm, f"{doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NIGHT_DEEP)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    hero = asset("public/assets/safari-crafters/ranthambhore-84d7a5a3.jpg")
    canvas.drawImage(hero, PAGE_W * 0.42, 0, PAGE_W * 0.58, PAGE_H, preserveAspectRatio=False, mask="auto")
    canvas.setFillColor(colors.Color(NIGHT.red, NIGHT.green, NIGHT.blue, alpha=0.62))
    canvas.rect(PAGE_W * 0.42, 0, PAGE_W * 0.58, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(colors.Color(NIGHT.red, NIGHT.green, NIGHT.blue, alpha=0.96))
    canvas.rect(0, 0, PAGE_W * 0.56, PAGE_H, stroke=0, fill=1)
    canvas.setStrokeColor(colors.Color(BRASS_LIGHT.red, BRASS_LIGHT.green, BRASS_LIGHT.blue, alpha=0.45))
    canvas.line(24 * mm, 58 * mm, PAGE_W * 0.5, 58 * mm)
    canvas.setFillColor(BRASS_LIGHT)
    canvas.setFont(FONT_SANS_BOLD, 8)
    canvas.drawString(24 * mm, PAGE_H - 42 * mm, "PROJECT STATE / MAY 2026")
    canvas.setFillColor(BONE)
    canvas.setFont(FONT_SERIF, 42)
    canvas.drawString(24 * mm, PAGE_H - 80 * mm, "Safari")
    canvas.drawString(24 * mm, PAGE_H - 98 * mm, "Crafters")
    canvas.setFont(FONT_SERIF, 20)
    canvas.setFillColor(BRASS_LIGHT)
    canvas.drawString(24 * mm, PAGE_H - 123 * mm, "Current website direction, structure and implementation")
    canvas.setFont(FONT_SANS, 9)
    canvas.setFillColor(colors.Color(BONE.red, BONE.green, BONE.blue, alpha=0.72))
    text = [
        "A luxury, photography-led safari website shaped around quiet editorial design,",
        "cinematic wilderness, specialist-led planning, conservation credibility and",
        "private aviation as a rare India safari advantage.",
    ]
    y = PAGE_H - 147 * mm
    for line in text:
        canvas.drawString(24 * mm, y, line)
        y -= 5 * mm
    canvas.setFillColor(colors.Color(BONE.red, BONE.green, BONE.blue, alpha=0.54))
    canvas.setFont(FONT_SANS_BOLD, 7)
    canvas.drawString(24 * mm, 38 * mm, "BUILT WITH NEXT.JS / SANITY-READY CONTENT / EDITORIAL LUXURY SYSTEM")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="Kicker",
    fontName=FONT_SANS_BOLD,
    fontSize=7,
    leading=9,
    textColor=BRASS,
    uppercase=True,
    spaceAfter=7,
    tracking=1.3,
))
styles.add(ParagraphStyle(
    name="TitleSerif",
    fontName=FONT_SERIF,
    fontSize=27,
    leading=30,
    textColor=INK,
    spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="H2Serif",
    fontName=FONT_SERIF,
    fontSize=19,
    leading=22,
    textColor=INK,
    spaceBefore=10,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="BodyLuxury",
    fontName=FONT_SANS,
    fontSize=8.7,
    leading=14,
    textColor=CHARCOAL,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="SmallMuted",
    fontName=FONT_SANS,
    fontSize=7.2,
    leading=10.5,
    textColor=MUTE,
))
styles.add(ParagraphStyle(
    name="CellTitle",
    fontName=FONT_SERIF,
    fontSize=14,
    leading=16,
    textColor=INK,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="CellBody",
    fontName=FONT_SANS,
    fontSize=7.4,
    leading=11,
    textColor=MUTE,
))
styles.add(ParagraphStyle(
    name="DarkKicker",
    fontName=FONT_SANS_BOLD,
    fontSize=7,
    leading=9,
    textColor=BRASS_LIGHT,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="DarkTitle",
    fontName=FONT_SERIF,
    fontSize=24,
    leading=27,
    textColor=BONE,
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="DarkBody",
    fontName=FONT_SANS,
    fontSize=8.5,
    leading=13.5,
    textColor=colors.Color(BONE.red, BONE.green, BONE.blue, alpha=0.72),
    spaceAfter=7,
))


def P(text: str, style: str = "BodyLuxury") -> Paragraph:
    return Paragraph(text, styles[style])


def bullets(items: list[str], dark: bool = False) -> ListFlowable:
    style = styles["DarkBody" if dark else "BodyLuxury"]
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=8) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=12,
        bulletFontName=FONT_SANS,
        bulletFontSize=5,
    )


def two_col_cards(cards: list[tuple[str, str]], cols: int = 2) -> Table:
    cell_w = (PAGE_W - 2 * MARGIN_X) / cols
    rows = []
    for i in range(0, len(cards), cols):
        row = []
        for title, body in cards[i:i + cols]:
            row.append([P(title, "CellTitle"), P(body, "CellBody")])
        while len(row) < cols:
            row.append("")
        rows.append(row)
    t = Table(rows, colWidths=[cell_w] * cols, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.45, colors.Color(BRASS.red, BRASS.green, BRASS.blue, alpha=0.28)),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.Color(BRASS.red, BRASS.green, BRASS.blue, alpha=0.22)),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    return t


def dark_band(title: str, body: str, items: list[str]) -> Table:
    content = [[P(title, "DarkTitle"), P(body, "DarkBody"), bullets(items, dark=True)]]
    table = Table(content, colWidths=[PAGE_W - 2 * MARGIN_X])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NIGHT),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.Color(BRASS_LIGHT.red, BRASS_LIGHT.green, BRASS_LIGHT.blue, alpha=0.25)),
        ("LEFTPADDING", (0, 0), (-1, -1), 18),
        ("RIGHTPADDING", (0, 0), (-1, -1), 18),
        ("TOPPADDING", (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
    ]))
    return table


def section_header(kicker: str, title: str, intro: str | None = None):
    out = [P(kicker.upper(), "Kicker"), P(title, "TitleSerif")]
    if intro:
        out.append(P(intro))
    out.append(Spacer(1, 5 * mm))
    return out


def build_story():
    story = [
        NextPageTemplate("Body"),
        PageBreak(),
    ]

    story += section_header(
        "Executive Summary",
        "Where the project stands today",
        "Safari Crafters has moved from a conventional safari website direction into a more distinctive luxury travel platform. The current build prioritizes cinematic photography, editorial restraint, specialist authority, conservation credibility and a concierge-led planning flow."
    )
    story.append(two_col_cards([
        ("Current homepage direction", "The live homepage now uses the concept experience: full-screen video hero, rotating cinematic one-line statements, refined logo/header, and a quieter editorial section flow."),
        ("Final navigation system", "The header and full-screen menu now treat the website as seven premium pillars: Journeys, Destinations, Photo Expeditions, The Journal, Conservation Commitment, Private Aviation and About."),
        ("Brand tone", "The site avoids package-tour language and instead uses considered copy around rare encounters, field intelligence, naturalist depth, photographic access and quiet luxury."),
        ("Technical foundation", "Built in Next.js 16 with React 19, TypeScript, Sanity-ready content structures, local JSON content, static generation and dynamic lead routes."),
    ]))
    story.append(Spacer(1, 7 * mm))
    story.append(P("Current content inventory", "H2Serif"))
    story.append(two_col_cards([
        ("14 Journeys", "Private safari routes including India big cats, Central India, Rajasthan, Ladakh, Terai and specialist wilderness journeys."),
        ("13 Destinations", "Editorial destination coverage across India, Africa and global wildlife regions."),
        ("3 Photo Expeditions", "A dedicated premium pillar for photographer-led departures and portfolio-minded wilderness travel."),
        ("6 Journal Articles", "Blogs have been repositioned as The Journal, with field notes, conservation intelligence and safari thinking."),
        ("3 Specialists", "Specialist-led trust layer supporting founder authority, route planning and guest confidence."),
        ("3 Testimonials", "Trust content available for homepage and supporting conversion sections."),
    ], cols=3))

    story.append(PageBreak())
    story += section_header(
        "Navigation and IA",
        "The site now behaves like a luxury brand, not a tour catalogue",
        "The information architecture has been consolidated around fewer, stronger content pillars. Lodges and Honeymoon Journeys are not main navigation items; lodge/stay content can live contextually inside journeys and destinations."
    )
    story.append(dark_band(
        "Final top-level navigation",
        "The opened menu uses a cinematic split layout: quiet editorial list on the left, full-bleed image stage on the right, hover-driven imagery, smaller numerals and a refined close control.",
        [
            "Journeys",
            "Destinations",
            "Photo Expeditions",
            "The Journal",
            "Conservation Commitment",
            "Private Aviation",
            "About",
            "Plan a Journey remains the main conversion CTA in the sticky header.",
        ],
    ))
    story.append(Spacer(1, 7 * mm))
    story.append(P("Implemented route map", "H2Serif"))
    story.append(two_col_cards([
        ("/", "Final concept homepage now replaces the earlier homepage."),
        ("/concept", "Design prototype route retained for review and comparison."),
        ("/journeys + /journeys/[slug]", "Journey index and detail templates."),
        ("/destinations + /destinations/[slug]", "Destination index and guide templates."),
        ("/photo-expeditions + detail", "Dedicated photography-led expedition pillar."),
        ("/journal + /journal/[slug]", "Editorial journal index and article pages."),
        ("/conservation-commitment", "New standalone conservation pillar."),
        ("/private-aviation", "New standalone private jet safari pillar."),
        ("/about + /specialists", "Founder authority, specialist trust and brand philosophy."),
        ("/plan + /contact", "Concierge enquiry and lead capture routes."),
        ("/legal/*", "Privacy, terms and cookie pages."),
        ("/studio", "Sanity studio route present for CMS workflow."),
    ], cols=3))

    story.append(PageBreak())
    story += section_header(
        "Current Homepage",
        "Cinematic, quiet and photography-led",
        "The homepage is now the concept experience. It is designed to feel immersive at first touch, with the brand mark, video, restraint and editorial confidence carrying the luxury impression."
    )
    story.append(two_col_cards([
        ("Hero video", "Uses safari-crafters.mp4 as the cinematic first viewport with a darkened overlay and concise rotating statements."),
        ("Rotating hero copy", "Current lines include: In pursuit of Stillness; Where rare moments unfold Beautifully; For sightings few ever Frame; Luxury beyond the Trail; Crafted for rare Encounters."),
        ("Sticky header", "Initially transparent, then semi-transparent dark on scroll. Logo, Plan a Journey and icon-only burger remain visible."),
        ("Private Safari Atelier", "Explains the operating philosophy: private planning, field intelligence, seamless comfort and purposeful access."),
        ("Species-led storytelling", "Uses Jawai as an example of destination pages opening around a memorable animal, landscape or field moment."),
        ("Magazine journey block", "Shows Photo Expeditions as signed field commissions, with mentor/species/equipment/access positioned before CTA."),
        ("Concierge planner", "Positions the form as a private concierge conversation rather than a generic booking funnel."),
    ], cols=2))

    story.append(PageBreak())
    story += section_header(
        "Design System",
        "A consolidated Forest / Bone / Brass palette",
        "A color audit found 110 literal color values before cleanup. The final system now centralizes the active brand palette in :root, with opacity handled through RGB channel tokens. Only the intended palette tokens remain as literal colors."
    )
    palette = [
        ("Night", "#100d0a"), ("Night Deep", "#0f0c09"), ("Night Warm", "#1d1711"),
        ("Bone", "#f4f0e8"), ("Ivory", "#e7dfcf"), ("Cream", "#f5f1e8"), ("Paper", "#fbfaf6"),
        ("Ink", "#11100e"), ("Soil", "#17120d"), ("Forest", "#172216"), ("Sal", "#3f5138"),
        ("Brass", "#9e7738"), ("Brass Light", "#d3ad69"), ("Copper", "#7c3f24"),
    ]
    swatches = []
    for name, hexv in palette:
        swatches.append([Paragraph(name, styles["CellTitle"]), Paragraph(hexv, styles["CellBody"])])
    t = Table([swatches[i:i+2] for i in range(0, len(swatches), 2)], colWidths=[(PAGE_W - 2*MARGIN_X)/2]*2)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.Color(BRASS.red, BRASS.green, BRASS.blue, alpha=0.18)),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(t)
    story.append(Spacer(1, 8 * mm))
    story.append(two_col_cards([
        ("Typography", "Display typography uses a luxury serif stack. Interface text, labels and descriptions use a restrained sans-serif stack. Letter spacing is reserved for small uppercase labels, not body copy."),
        ("Motion", "Hero copy and menu imagery use slow cinematic transitions. Reduced-motion is respected for hero line animation."),
        ("Image direction", "The visual system depends on real curated wildlife photography, darker cinematic overlays and subject-aware cropping."),
        ("Component language", "Cards are used sparingly. Repeated page sections use editorial bands, framed image areas, hairlines and restrained brass accents."),
    ]))

    story.append(PageBreak())
    story += section_header(
        "Core Pillars",
        "How each primary section works now",
    )
    story.append(two_col_cards([
        ("Journeys", "Replaces Tours and Itineraries. Journey pages include cinematic hero, editorial intro, at-a-glance context, day-by-day pacing, suggested destinations, lodge highlights and specialist CTA."),
        ("Destinations", "Premium editorial guides organized around place, species, seasonality, wildlife highlights, photography opportunities and suggested journeys."),
        ("Photo Expeditions", "A major differentiator. Positions photography as a standalone premium pillar, including skill level, mentor, group size, species focus, equipment guidance and gallery intent."),
        ("The Journal", "Blogs repositioned as editorial field intelligence: conservation, photography, people, places and safari thinking."),
        ("Conservation Commitment", "Now a standalone pillar showing how Safari Crafters gives back through Astral Foundation without donation-led guest appeals."),
        ("Private Aviation", "Standalone luxury advantage page around company-owned private jet safari circuits through Kairamya Air."),
    ], cols=2))

    story.append(PageBreak())
    story += section_header(
        "Conservation Commitment",
        "Astral Foundation is now represented as proof, not fundraising",
        "The new conservation page explains that Safari Crafters does not ask guests to fund the wild. Instead, it frames conservation as responsibility through Astral Foundation."
    )
    story.append(dark_band(
        "Conservation work now mentioned",
        "The page includes specific proof-points from the Astral Foundation material while keeping the tone quiet and premium.",
        [
            "Skill training and community development",
            "Vikas Kendra support",
            "Field vehicles and electric vehicle support",
            "Freshwater initiatives",
            "Battery support for chowkis and solar-backed infrastructure",
            "Camera-trap documentation",
            "Leopard population study",
            "Eurasian otter field work and tagged otter release",
            "Grassland work",
            "Panna and Kanha landscape support, including Pathan Jhiriya, Kariwa, Jamun Tola and Madhhwa Dadar",
        ],
    ))
    story.append(Spacer(1, 7 * mm))
    story.append(P("Important positioning", "H2Serif"))
    story.append(P("This section should remain non-fundraising. It should communicate credibility, responsibility and long-term involvement in Indian wildlife landscapes. It should not read like a donation page or NGO campaign page."))

    story.append(PageBreak())
    story += section_header(
        "Private Aviation",
        "A rare India safari advantage",
        "Private Aviation is now a top-level pillar with its own page. It positions Safari Crafters as able to shape rare private air safari circuits through Kairamya Air."
    )
    story.append(two_col_cards([
        ("Gulfstream G150", "Presented as longer private routing with a spacious cabin for 7-8 guests, suited to multi-region journeys where time and comfort matter."),
        ("Cessna Citation CJ2", "Presented as elegant regional access for up to 6 guests, suited to short-haul safari routing and wilderness extensions."),
        ("Strategic value", "Connects tiger forests, leopard country, high-altitude valleys, desert edges, royal cities and remote conservation landscapes."),
        ("Brand role", "This should remain a luxury logistics advantage, not a separate aviation brand takeover."),
    ]))

    story.append(PageBreak())
    story += section_header(
        "Technical Current State",
        "What has been implemented in the codebase",
    )
    story.append(two_col_cards([
        ("Frontend", "Next.js 16 App Router, React 19 and TypeScript."),
        ("CMS readiness", "Sanity dependencies and /studio route are present. Site content currently also exists in content/site-content.json."),
        ("Content helpers", "lib/data.ts and lib/luxury.ts power route templates and detail page context."),
        ("Forms", "/plan, /contact and /api/enquiry exist for enquiry routing and lead capture foundation."),
        ("SEO infrastructure", "robots.ts, sitemap.ts, rss.xml route and dynamic metadata foundations are present."),
        ("Admin", "/admin and /api/admin/content/upload routes exist for content operations."),
    ], cols=2))
    story.append(Spacer(1, 7 * mm))
    story.append(P("Latest verification status", "H2Serif"))
    story.append(bullets([
        "npm run typecheck: passed after latest conservation update.",
        "npm run build: passed after latest conservation update.",
        "Local route /conservation-commitment returned HTTP 200.",
        "Production build currently generates 63 app routes/pages.",
    ]))

    story.append(PageBreak())
    story += section_header(
        "What Still Needs Attention",
        "Recommended next phase before production launch",
        "The current website has a strong luxury direction and a working route structure. The next work should harden content, CMS workflows, visual assets and conversion plumbing."
    )
    story.append(two_col_cards([
        ("Real photography curation", "Replace any placeholder or mismatched crops with a curated, credited image set. Every hero and menu image should be art-directed."),
        ("Founder/specialist portraits", "Add real portraits of Kairav Engineer, Gaurav Ramdharan and specialists to strengthen authority."),
        ("CMS completion", "Move all key content types into Sanity with validations for alt text, photo credit, SEO title/description and specialist CTAs."),
        ("Lead routing", "Finalize Supabase/HubSpot lead storage, email notifications, auto-reply and specialist routing."),
        ("SEO redirects", "Add redirects from /tours to /journeys, /itineraries to /journeys, /blogs to /journal and old article/tour URLs."),
        ("Accessibility QA", "Run mobile/desktop audits for focus states, form labels, contrast, reduced motion and keyboard navigation."),
        ("Performance QA", "Optimize video strategy, image sizes and first-load JS before launch."),
        ("Client review", "Review copy accuracy for conservation and aviation claims before public release."),
    ], cols=2))

    story.append(PageBreak())
    story += section_header(
        "Conclusion",
        "A luxury safari brand system is now visible",
        "The project has moved meaningfully toward the PRD ambition: premium, editorial, cinematic and conversion-aware without looking like a mass-market package-tour website."
    )
    story.append(dark_band(
        "Current strategic position",
        "Safari Crafters can now be presented as a specialist-led luxury safari atelier with three distinguishing layers: photography-led wilderness, conservation responsibility through Astral Foundation and private aviation access through Kairamya Air.",
        [
            "Homepage and header/menu direction are now final design references for the wider site.",
            "Core content architecture is aligned to the PRD direction.",
            "Conservation Commitment and Private Aviation have become top-level brand pillars.",
            "The next phase should focus on production-grade content, CMS workflow, imagery, SEO migration and lead integrations.",
        ],
    ))

    return story


def build_pdf():
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="Safari Crafters Current Project State",
        author="OpenAI Codex",
    )
    frame = Frame(MARGIN_X, 18 * mm, PAGE_W - 2 * MARGIN_X, PAGE_H - 40 * mm, id="body")
    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[frame], onPage=cover_page),
        PageTemplate(id="Body", frames=[frame], onPage=on_page),
    ])
    story = build_story()
    doc.build(story)


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    build_pdf()
    print(OUT)
