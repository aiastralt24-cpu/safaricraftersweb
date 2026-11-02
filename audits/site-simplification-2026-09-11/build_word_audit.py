from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUT = Path(__file__).with_name("Safari_Crafters_Pagewise_Website_Changes.docx")

BLACK = "000000"
CHARCOAL = "26231F"
BRASS = "9E7738"
PALE = "F4F0E8"
PALE_GREY = "F5F5F3"
BORDER = "D9D9D9"
MUTED = "6F6A61"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color=BORDER, size="5"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn("w:" + margin))
        if node is None:
            node = OxmlElement("w:" + margin)
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    run.font.name = "Arial"
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    fld_char_1 = OxmlElement("w:fldChar")
    fld_char_1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char_2 = OxmlElement("w:fldChar")
    fld_char_2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_1)
    run._r.append(instr_text)
    run._r.append(fld_char_2)


def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    p.paragraph_format.keep_with_next = True
    return p


def add_body(doc, text, bold_lead=None):
    p = doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        r = p.add_run(bold_lead)
        r.bold = True
        p.add_run(text[len(bold_lead):])
    else:
        p.add_run(text)
    return p


def add_bullets(doc, items, level=0):
    for item in items:
        p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
        p.add_run(item)


def add_numbered(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Number")
        p.add_run(item)


def add_change_block(doc, title, priority, current, changes, device, acceptance):
    add_heading(doc, title, 2)
    p = doc.add_paragraph()
    r = p.add_run(priority)
    r.bold = True
    r.font.color.rgb = RGBColor.from_string(BRASS)
    p.paragraph_format.space_after = Pt(6)
    add_body(doc, "Current finding  " + current, "Current finding  ")
    add_body(doc, "Required changes", "Required changes")
    add_bullets(doc, changes)
    add_body(doc, "Responsive treatment  " + device, "Responsive treatment  ")
    add_body(doc, "Completion test  " + acceptance, "Completion test  ")


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(0.7)
section.bottom_margin = Inches(0.65)
section.left_margin = Inches(0.78)
section.right_margin = Inches(0.78)
section.header_distance = Inches(0.3)
section.footer_distance = Inches(0.3)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Arial"
normal.font.size = Pt(10.8)
normal.font.color.rgb = RGBColor.from_string(CHARCOAL)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12

title_style = styles["Title"]
title_style.font.name = "Georgia"
title_style.font.size = Pt(30)
title_style.font.bold = False
title_style.font.color.rgb = RGBColor.from_string(BLACK)
title_style.paragraph_format.space_after = Pt(12)
title_ppr = title_style._element.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)

for style_name, size in (("Heading 1", 21), ("Heading 2", 15), ("Heading 3", 11.5)):
    style = styles[style_name]
    style.font.name = "Georgia" if style_name != "Heading 3" else "Arial"
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(BLACK)
    style.paragraph_format.keep_with_next = True
    style.paragraph_format.space_before = Pt(14 if style_name == "Heading 1" else 10)
    style.paragraph_format.space_after = Pt(6)

for list_style_name in ("List Bullet", "List Bullet 2", "List Number"):
    style = styles[list_style_name]
    style.font.name = "Arial"
    style.font.size = Pt(10.8)
    style.font.color.rgb = RGBColor.from_string(CHARCOAL)
    style.paragraph_format.space_after = Pt(4)
    style.paragraph_format.line_spacing = 1.1

if "Metadata" not in styles:
    metadata = styles.add_style("Metadata", WD_STYLE_TYPE.PARAGRAPH)
else:
    metadata = styles["Metadata"]
metadata.font.name = "Arial"
metadata.font.size = Pt(9)
metadata.font.bold = True
metadata.font.color.rgb = RGBColor.from_string(BRASS)
metadata.paragraph_format.space_after = Pt(5)

header = section.header
hp = header.paragraphs[0]
hp.text = "SAFARI CRAFTERS   WEBSITE CHANGE PLAN"
hp.style = styles["Normal"]
hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
for run in hp.runs:
    run.font.name = "Arial"
    run.font.size = Pt(8)
    run.font.bold = True
    run.font.color.rgb = RGBColor.from_string(BLACK)

footer = section.footer
fp = footer.paragraphs[0]
add_page_number(fp)

# Cover page
p = doc.add_paragraph(style="Metadata")
p.add_run("SAFARI CRAFTERS")
p.paragraph_format.space_before = Pt(70)
p.paragraph_format.space_after = Pt(26)

doc.add_paragraph("Safari Crafters Website Simplification Plan", style="Title")

p = doc.add_paragraph()
r = p.add_run("All recommended changes organised page by page")
r.font.name = "Arial"
r.font.size = Pt(15)
r.font.color.rgb = RGBColor.from_string(MUTED)
p.paragraph_format.space_after = Pt(22)

add_body(doc, "Prepared from the cross device audit of the current beta website on mobile, tablet, desktop and large desktop.")
add_body(doc, "12 September 2026")

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(160)
r = p.add_run("Purpose")
r.bold = True
r.font.color.rgb = RGBColor.from_string(BRASS)
r.font.size = Pt(10)
add_body(doc, "This document defines what should change on every public website page, why each change matters, how it should behave across devices, and how the team can verify completion.")

doc.add_page_break()

add_heading(doc, "Executive Decision", 1)
add_body(doc, "The website should preserve its photography, editorial type and restrained luxury aesthetic. The next phase should simplify the product architecture, navigation and content flow. The site is responsive at tested widths, but important pages remain too long and force visitors to interpret overlapping offers.")
add_body(doc, "The recommended commercial structure is Private Tailor Made Journeys, Hosted Small Group Safaris and Specialist Photo Expeditions. Travel With a Private Guide should be presented as a service added to a private journey. Private Aviation should support relevant itineraries rather than compete with the safari products.")

add_heading(doc, "Key Audit Measurements", 2)
metrics = [
    ("Homepage", "12.4 mobile screens", "Too many major chapters before the final action"),
    ("Private journey detail", "16.6 mobile screens", "Too much narrative before practical detail and enquiry"),
    ("Guided bespoke safaris", "13.0 mobile screens", "Product meaning overlaps with private journeys"),
    ("Photo expeditions", "7.6 mobile screens", "Best defined product but mobile filters use too much space"),
    ("Plan", "4.0 mobile screens", "Concise but framed as private only"),
    ("Primary menu", "11 equal items", "Visitors must understand internal taxonomy before choosing"),
]
table = doc.add_table(rows=1, cols=3)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
widths = [Inches(1.75), Inches(1.55), Inches(3.65)]
headers = ["Page or area", "Measured state", "Main finding"]
for i, cell in enumerate(table.rows[0].cells):
    cell.width = widths[i]
    set_cell_shading(cell, CHARCOAL)
    set_cell_border(cell)
    set_cell_margins(cell)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p = cell.paragraphs[0]
    r = p.add_run(headers[i])
    r.bold = True
    r.font.color.rgb = RGBColor(255, 255, 255)
    r.font.size = Pt(9.5)
set_repeat_table_header(table.rows[0])
for idx, row_data in enumerate(metrics):
    cells = table.add_row().cells
    for i, value in enumerate(row_data):
        cells[i].width = widths[i]
        set_cell_border(cells[i])
        set_cell_margins(cells[i])
        if idx % 2:
            set_cell_shading(cells[i], PALE_GREY)
        cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cells[i].paragraphs[0]
        r = p.add_run(value)
        r.font.size = Pt(9.3)

add_heading(doc, "Product Architecture", 1)
products = [
    ("Private Tailor Made Journeys", "Private and customisable", "Couples families friends and solo travellers", "Plan this journey"),
    ("Hosted Small Group Safaris", "Fixed date shared departure", "Travellers who want expert hosting without photography tuition", "Check availability"),
    ("Specialist Photo Expeditions", "Fixed date photography led departure", "Photographers seeking field access and mentorship", "Check availability"),
    ("Travel With a Private Guide", "Service added to a private journey", "Guests who want continuous Safari Crafters field leadership", "Plan with a private guide"),
]
table = doc.add_table(rows=1, cols=4)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
widths = [Inches(1.8), Inches(1.55), Inches(2.55), Inches(1.05)]
headers = ["Offer", "Travel model", "Best suited to", "Primary action"]
for i, cell in enumerate(table.rows[0].cells):
    cell.width = widths[i]
    set_cell_shading(cell, CHARCOAL)
    set_cell_border(cell)
    set_cell_margins(cell, 110, 100, 110, 100)
    p = cell.paragraphs[0]
    r = p.add_run(headers[i])
    r.bold = True
    r.font.color.rgb = RGBColor(255, 255, 255)
    r.font.size = Pt(8.8)
set_repeat_table_header(table.rows[0])
for idx, row_data in enumerate(products):
    cells = table.add_row().cells
    for i, value in enumerate(row_data):
        cells[i].width = widths[i]
        set_cell_border(cells[i])
        set_cell_margins(cells[i], 100, 100, 100, 100)
        if idx % 2:
            set_cell_shading(cells[i], PALE_GREY)
        cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        r = cells[i].paragraphs[0].add_run(value)
        r.font.size = Pt(8.8)

add_heading(doc, "Recommended Navigation", 1)
add_body(doc, "The header should use six primary destinations and one clear planning action. The full screen menu can remain, but it should group links by visitor intent rather than numbering eleven equal choices.")
add_bullets(doc, [
    "Journeys",
    "Destinations",
    "Scheduled Departures",
    "Journal",
    "About",
    "Plan a Safari",
])
add_body(doc, "Journeys should contain Private Tailor Made Journeys and Travel With a Private Guide. Scheduled Departures should contain Hosted Small Group Safaris, Photo Expeditions and the departure calendar. Guest Notes, Conservation, Private Aviation, Store, Contact and legal pages should move to secondary navigation and the footer.")

add_heading(doc, "Pagewise Change Plan", 1)
add_body(doc, "Each page below includes the current finding, required changes, responsive treatment and completion test. Priorities are ordered as P0 for structural work, P1 for template simplification and P2 for supporting authority or commerce work.")

blocks = [
    ("Global Header And Menu", "P0", "The full screen menu presents eleven entries with almost equal visual weight. The menu is technically usable but creates a navigation decision before the visitor understands the product range.", [
        "Use the six item primary navigation defined in this document.",
        "Group private journeys and the private guide service under Journeys.",
        "Group hosted safaris photo expeditions and the calendar under Scheduled Departures.",
        "Move Store Conservation Guest Notes Private Aviation and Contact to secondary navigation.",
        "Keep Plan a Safari as the persistent header action.",
    ], "Mobile should show the core journey choices in the first viewport. Secondary links may follow in a smaller utility list. Tablet and desktop should use the same information hierarchy.", "A first time visitor can locate private travel hosted group travel and photo travel in ten seconds or less."),
    ("Footer", "P0", "The footer repeats several categories and continues the private only framing through Begin a Private Journey.", [
        "Reduce the footer to Travel Discover and Company groups.",
        "Change Begin a Private Journey to Plan a Safari.",
        "Keep direct contact social links legal links and the concise brand statement.",
        "Remove duplicate routes that already appear in the same footer group.",
    ], "Use a single column or compact accordion structure on mobile. Maintain generous spacing and minimum tap targets.", "Every footer link has one clear home and the primary footer action works for private hosted and photography enquiries."),
    ("Homepage", "P0", "The homepage is visually strong but reaches approximately 12.4 mobile screens. Private Aviation receives a full chapter before the visitor has completed the main safari decision path.", [
        "Rewrite the hero so it identifies private and small group wildlife journeys while retaining the emotional brand line as a secondary element.",
        "Show three ways to travel immediately after the hero: Private Tailor Made Hosted Small Group and Photo Expeditions.",
        "Show only three featured products: one private journey one hosted departure and one photo expedition.",
        "Add three concise proof points and one guest quote.",
        "Show four regional destination cards with signature wildlife and best travel period.",
        "End with one Safari Brief action and one direct specialist option.",
        "Remove the large Private Aviation chapter and one duplicate journey or photography showcase.",
        "Keep no more than one substantial scroll expansion image moment.",
    ], "Target five to six desktop screens and seven to eight mobile screens. Keep approximately 220 to 300 visible words. The first product choice should appear within the first two sections at every width.", "Visitors can reach a relevant product family in two actions or fewer and no enabling service visually outranks the safari products."),
    ("Private Journeys Listing", "P1", "The page has a strong visual system but the meaning of Journeys is not explicit and the mobile filter area occupies too much early space.", [
        "Rename the collection Private Tailor Made Journeys.",
        "Use high intent filters: Region Wildlife Ideal Month Duration and Pace.",
        "Show route suggested duration best season and private customisable status on every card.",
        "Remove descriptive fragments that do not help comparison.",
        "Keep a visible count of results and active filters.",
    ], "Replace the mobile chip grid with one Filter button that opens a bottom sheet. Desktop can retain inline filters if they fit without pushing the collection below the fold.", "A visitor can compare three private journeys from the listing without opening each detail page."),
    ("Private Journey Detail", "P1", "The opening hero and fact ledger are excellent, but a representative page reaches approximately 16.6 mobile screens and 1030 words.", [
        "Keep the hero route duration season and travel style ledger.",
        "Follow with five journey highlights then a route summary accommodation and a concise day by day overview.",
        "Move detailed itinerary field notes inclusions and FAQs into accessible accordions.",
        "Keep 350 to 550 words visible before optional detail.",
        "Add the responsible specialist near the first planning action.",
        "Use Plan this journey as the primary action and Download itinerary as the secondary action.",
        "Remove repeated philosophical copy that does not affect the travel decision.",
    ], "After the hero use a sticky bottom action on mobile. It should appear only after the visitor has seen the core facts. Desktop anchor navigation may remain.", "Duration route ideal season travel style and next action are visible within one mobile screen after the hero."),
    ("Destinations Hub", "P1", "The page creates desire but does not explain quickly how destinations should be compared or chosen.", [
        "Add a direct opening sentence explaining that the page helps visitors choose the right wildlife landscape.",
        "Lead every card with region signature wildlife best season and suitable travel style.",
        "Provide Region Wildlife and Best Month filters.",
        "Connect every destination directly to relevant private journeys and departures.",
    ], "Use one mobile Filter button and compact result cards. Do not make users scroll through descriptive copy before the collection.", "A visitor who knows a travel month but not a destination can narrow the collection immediately."),
    ("Destination Detail", "P1", "The destination stories are distinctive but practical suitability and the route to a journey appear too late.", [
        "Make Why go Best time Signature wildlife Ideal stay and Access the first factual block.",
        "Limit visible editorial prose to 300 to 450 words.",
        "Place the longer field narrative behind Read the full field note.",
        "Show relevant private journeys hosted departures and photo expeditions.",
        "Use See journeys in this destination before the planning action.",
    ], "Keep the factual block compact and readable without a horizontal table. Use stacked key value rows on mobile.", "Inspiration and suitability are visible together before the visitor reaches optional editorial depth."),
    ("Hosted Small Group Safaris", "P0", "The website does not currently present a non private non photography hosted safari product.", [
        "Create a hub that explains what hosted means who leads the journey group size fixed dates and who the format suits.",
        "Clearly compare hosted travel with private journeys and photo expeditions.",
        "Show location dates duration group size host price from and availability on every departure card.",
        "Create a detail template covering daily rhythm accommodation inclusions physical level single supplement cancellation terms and booking state.",
        "Use Check availability as the primary action.",
    ], "Cards should stack into a concise chronological departure list on mobile. Fixed facts must never be hidden behind Read more.", "Every departure states whether it is shared fixed date and photography led without requiring an enquiry."),
    ("Travel With A Private Guide", "P0", "The current Bespoke Safaris page is actually a private guide add on. Its existing label makes it appear to be a separate journey category and the page reaches approximately 13 mobile screens.", [
        "Rename the page Travel With a Private Guide or Private Guide Service.",
        "State in the first screen that the service adds a Safari Crafters guide to a private itinerary.",
        "Retain the field intelligence story and strongest imagery.",
        "Reduce repeated editorial modules and target seven to eight mobile screens.",
        "Use Plan with a private guide as the single primary action.",
    ], "Stack the hero image and explanation in an order that keeps the service definition and action visible early. Avoid oversized display headings that push the definition below the fold.", "No visitor mistakes this service for a hosted group safari or another form of private itinerary."),
    ("Photo Expeditions", "P1", "This is the clearest current product page because it communicates small groups and mentorship. Important qualification facts still need stronger placement.", [
        "Show dates duration group size leader skill level vehicle occupancy and price or availability on every expedition card.",
        "Explain equipment assumptions and the balance between photography instruction and wildlife guiding.",
        "Use View expedition on browsing cards and Check availability on detail pages.",
        "Reduce filter height and remove redundant introductory copy.",
    ], "Use one mobile Filter button and a chronological list. Keep date group size leader and availability visible without expansion.", "A serious photographer can qualify an expedition from the listing card."),
    ("Private Aviation", "P0", "Private Aviation currently has the visual and navigational weight of a core safari product even though it is normally a routing service.", [
        "Remove the full Private Aviation chapter from the homepage.",
        "Move the page out of primary navigation while retaining the standalone route for search and high intent visitors.",
        "Shorten the page to where it helps sample routes partner standards baggage limits and enquiry.",
        "Add Private aviation available only to journeys where it materially improves routing.",
    ], "Use concise route examples and operational facts. Avoid multiple full screen atmospheric sections on mobile.", "Aviation strengthens the selected safari and never competes with choosing the safari itself."),
    ("Plan A Safari", "P0", "The planner is the most concise major page, but the title and default state make every enquiry appear private. It also asks geography before travel style.", [
        "Rename Private Safari Brief to Safari Brief.",
        "Make the first question How would you like to travel.",
        "Offer Private Tailor Made Hosted Small Group Photo Expedition and Not Sure.",
        "Ask destination and wildlife interests after travel style.",
        "Show an expected completion time of about two minutes.",
        "Keep Back available at every later step and preserve entered data.",
        "Offer Speak to a specialist as a short route for experienced travellers.",
    ], "Use full width choice cards on mobile and a compact two column arrangement on tablet where space permits. The form must remain keyboard operable and validation changes must be announced.", "All product enquiries enter one routing system without being mislabeled private."),
    ("About", "P1", "The new hero and portraits are strong, but leadership proof follows a generic brand introduction.", [
        "Place a concise brand statement followed immediately by the three leaders.",
        "Keep The wild shaped each of us differently as the leadership heading.",
        "Limit each visible biography to 80 to 120 words and use the accessible Read more control for the remainder.",
        "Place field years journeys led countries and awards beside the relevant person rather than in generic counters.",
        "Keep the ethical photography and conservation principles but reduce repeated prose.",
    ], "Stack each portrait before its biography on mobile and keep the person's name and role adjacent to the image. Avoid oversized headings that create large empty areas on tablet and desktop.", "The visitor understands who owns the experience and why they are credible within two screens."),
    ("Specialists", "P2", "The detailed specialists route is currently hidden and duplicates leadership information while its final role remains unresolved.", [
        "Keep the route out of primary navigation until its purpose and content are complete.",
        "Use concise leadership profiles on About in the interim.",
        "When reintroduced connect every specialist to relevant journeys or departures and provide one appropriate planning action.",
        "Avoid duplicating the same full biographies across About and Specialists.",
    ], "Use a consistent portrait ratio and short profile summaries. Mobile cards should not place long biography text beside narrow images.", "The page returns only when it adds planning value beyond the About page."),
    ("Journal", "P2", "The journal contains too many equal headlines and links in one long presentation.", [
        "Show six featured or recent articles initially.",
        "Use Field Notes Photography Conservation and Culture filters only if the article volume supports them.",
        "Add pagination or Load more rather than displaying the whole archive.",
        "End every article with one relevant destination or journey.",
    ], "Use a single featured story followed by compact cards on mobile. Do not reproduce desktop masonry density in a single column.", "The journal demonstrates authority and provides a relevant onward route."),
    ("Guest Notes", "P2", "The archive is concise but isolated from the main purchase decision.", [
        "Keep the dedicated archive short.",
        "Pull the strongest one line quotes into the homepage journey pages and departure pages.",
        "Add travel style year destination and permission or verification state where appropriate.",
        "Add filters only by travel style once review volume justifies them.",
    ], "Use short quotes and clear attribution. Avoid large quotation typography that consumes an entire mobile screen.", "Guest proof appears beside the decision it is intended to support."),
    ("Conservation", "P2", "The page has a strong tone but is long and has no useful onward route.", [
        "Replace broad claims with three concrete initiatives.",
        "For each initiative show location partner action date and outcome.",
        "Add sources or an annual update where available.",
        "End with relevant journeys and a direct contact route.",
        "Reduce visible prose to approximately 250 to 350 words before evidence details.",
    ], "Use concise evidence cards that stack cleanly. Keep key results visible and place methodology or background in expansion controls.", "The page demonstrates recent evidence and gives the visitor a relevant next step."),
    ("Store", "P0 and P2", "Books is a category and Ghosts of the Granite Hills is one product. The previous single product treatment did not show how future categories would fit.", [
        "Keep Store as the category landing page.",
        "Keep Books as a separate category route.",
        "Keep Ghosts of the Granite Hills as an individual product route.",
        "Retain reusable future category and product routes.",
        "Do not restore the incorrect individually numbered and signed claim. The current source no longer contains it.",
        "Add future categories only when real inventory exists. Do not display empty placeholders.",
        "Complete operational commerce fields for SKU variants stock fulfilment regions shipping taxes currency returns related products cart behaviour and analytics.",
    ], "Category cards should become a clean one column list on small mobile screens. Product media should preserve its crop without forcing essential purchase details below several image panels.", "A second category and product can be added through data and content entry without creating a new page component. Checkout also exposes the correct operational rules."),
    ("Contact", "P2", "The contact page is appropriately concise but planning and general contact can still be confused.", [
        "Separate General Contact Existing Booking and Plan a Safari routes.",
        "Show the expected response time.",
        "Show WhatsApp only if it is actively staffed.",
        "Keep journey planning in the Safari Brief rather than duplicating the full form.",
    ], "Use clear full width actions and properly labelled fields on mobile. Preserve error messages and entered information.", "Travellers reach the correct contact route without completing the wrong form."),
    ("Search", "P2", "Search results can mix journeys destinations articles and store products without enough visible distinction.", [
        "Keep Search as a utility rather than a primary menu destination.",
        "Label every result as Journey Departure Destination Journal or Store.",
        "Group or filter results by content type when result volume requires it.",
        "Use the correct action language for each result type.",
    ], "Mobile result rows should keep the type label title and key fact visible without truncating the action.", "Visitors can distinguish commercial products from editorial and store content at a glance."),
    ("Legal And Administrative Pages", "P2", "These routes do not need editorial redesign but must remain accurate and separate from the public conversion flow.", [
        "Keep Privacy Terms and Cookies in the footer only.",
        "Check policy dates company details and international commerce language before launch.",
        "Keep administrative routes excluded from public navigation and search indexing.",
    ], "Prioritise readable text width and accessible heading structure over decorative treatment.", "Policies are current findable and do not interrupt the main travel journey."),
]

for block in blocks:
    add_change_block(doc, *block)

add_heading(doc, "Shared Content And Interface Rules", 1)

add_heading(doc, "Visible Word Targets", 2)
targets = [
    ("Homepage", "220 to 300"),
    ("Hub or listing introduction", "100 to 180"),
    ("Journey or departure detail", "350 to 550 before expandable detail"),
    ("Destination detail", "300 to 450 before field notes"),
    ("Service page", "250 to 400"),
    ("About", "300 to 450 plus expandable biographies"),
    ("Conservation", "250 to 350 plus evidence detail"),
]
table = doc.add_table(rows=1, cols=2)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
widths = [Inches(3.5), Inches(3.3)]
for i, header_text in enumerate(("Template", "Recommended visible words")):
    cell = table.rows[0].cells[i]
    cell.width = widths[i]
    set_cell_shading(cell, CHARCOAL)
    set_cell_border(cell)
    set_cell_margins(cell)
    r = cell.paragraphs[0].add_run(header_text)
    r.bold = True
    r.font.color.rgb = RGBColor(255, 255, 255)
set_repeat_table_header(table.rows[0])
for idx, row_data in enumerate(targets):
    cells = table.add_row().cells
    for i, value in enumerate(row_data):
        cells[i].width = widths[i]
        set_cell_border(cells[i])
        set_cell_margins(cells[i])
        if idx % 2:
            set_cell_shading(cells[i], PALE_GREY)
        cells[i].paragraphs[0].add_run(value)

add_heading(doc, "Read More Rules", 2)
add_body(doc, "Use Read more for biographies field notes detailed day by day content and optional context. Never hide the value proposition dates group size price guidance inclusions availability or primary action. The current expandable component uses a real button with expansion state and can support this pattern across breakpoints.")

add_heading(doc, "Typography Rules", 2)
add_bullets(doc, [
    "Use one display role one H1 H2 section headings H3 card titles body or intro text and one label style per page.",
    "Use the existing global type ladder instead of page specific font sizes.",
    "Keep body lines near 60 to 68 characters.",
    "Keep labels at 12 pixels or larger.",
    "On mobile do not let a decorative heading occupy the complete screen while hiding the next decision.",
    "Pair every poetic headline with a direct factual sentence.",
])

add_heading(doc, "Action Labels", 2)
add_bullets(doc, [
    "Plan this journey for a private itinerary",
    "Check availability for a fixed departure",
    "View journeys when moving from destination to product collection",
    "Speak to a specialist for direct human help",
])
add_body(doc, "Retire interchangeable labels such as Explore Begin Enquire privately Request details and Speak with us when a more specific action is available.")

add_heading(doc, "Motion And Performance", 2)
add_bullets(doc, [
    "Keep one signature scroll expansion moment on a long page.",
    "Use reveals to clarify hierarchy rather than delay information.",
    "Never make dates route price availability or the primary action dependent on scroll animation.",
    "Avoid consecutive full viewport image chapters.",
    "Use tested poster images muted autoplay playsInline and a static fallback for mobile video.",
    "Prioritise above the fold hero images. The local audit produced Largest Contentful Paint warnings on Journeys Travel With a Private Guide and Photo Expeditions.",
    "Retain the existing reduced motion support and test it on every animated template.",
])

add_heading(doc, "Accessibility", 2)
add_bullets(doc, [
    "Verify muted grey text against ivory backgrounds at WCAG AA contrast.",
    "Keep visible keyboard focus on menus filters cards accordions and form choices.",
    "Validate hero text contrast against every video or image frame.",
    "Announce filter result counts and planner validation changes to assistive technology.",
    "Retain the skip link real accordion buttons expansion state and reduced motion support already present.",
])

add_heading(doc, "Implementation Sequence", 1)

roadmap = [
    ("P0", "Architecture and clarity", "Weeks 1 and 2", "Product naming menu homepage order planner first step private aviation placement action labels"),
    ("P1", "Template simplification", "Weeks 2 to 4", "Journey and destination templates mobile filters comparison facts hosted departure templates leadership proof"),
    ("P2", "Authority and commerce", "Weeks 4 to 6", "Conservation evidence journal bridges guest proof store operations availability pricing and user testing"),
]
table = doc.add_table(rows=1, cols=4)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
widths = [Inches(0.6), Inches(1.55), Inches(1.15), Inches(3.55)]
headers = ["Priority", "Workstream", "Timing", "Included changes"]
for i, cell in enumerate(table.rows[0].cells):
    cell.width = widths[i]
    set_cell_shading(cell, CHARCOAL)
    set_cell_border(cell)
    set_cell_margins(cell)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i in (0, 2) else WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(headers[i])
    r.bold = True
    r.font.color.rgb = RGBColor(255, 255, 255)
    r.font.size = Pt(9)
set_repeat_table_header(table.rows[0])
for idx, row_data in enumerate(roadmap):
    cells = table.add_row().cells
    for i, value in enumerate(row_data):
        cells[i].width = widths[i]
        set_cell_border(cells[i])
        set_cell_margins(cells[i])
        if idx % 2:
            set_cell_shading(cells[i], PALE_GREY)
        cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i in (0, 2) else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(value)
        r.font.size = Pt(9)

add_heading(doc, "Final Acceptance Criteria", 1)
add_numbered(doc, [
    "The primary header has no more than six choices plus Plan a Safari.",
    "Private Hosted Small Group and Photo travel appear within the first two homepage sections.",
    "The homepage reaches the footer within eight mobile screens.",
    "A private journey detail reaches the footer within eleven mobile screens with optional detail collapsed.",
    "Every fixed departure shows dates duration group size leader price guidance and availability.",
    "Every page has one dominant action.",
    "Private Aviation no longer precedes or visually outranks safari products.",
    "The planner accepts Private Hosted Small Group Photo Expedition and Not Sure.",
    "A second store category can be added without a new page component.",
    "Core pages pass mobile tablet desktop large desktop keyboard reduced motion and WCAG AA contrast checks.",
])

add_heading(doc, "Validation", 1)
add_body(doc, "After the P0 prototype is complete conduct moderated tests with five experienced safari travellers and three first time luxury safari buyers. Ask each participant to identify the available travel styles choose a suitable product and reach the correct enquiry path without explanation. Record time to choice wrong turns and unanswered questions before starting the P1 template rollout.")

add_heading(doc, "Source And Scope", 1)
add_body(doc, "This plan is based on the current Safari Crafters beta build source inspection and cross device screenshots captured at 390 by 844 834 by 1112 1440 by 900 and 1728 by 1117. It is an expert product and interface audit rather than a completed traveller interview study.")

doc.core_properties.title = "Safari Crafters Website Simplification Plan"
doc.core_properties.subject = "Pagewise website changes and implementation priorities"
doc.core_properties.author = "Safari Crafters"
doc.core_properties.keywords = "website audit, pagewise changes, responsive design, navigation, safari journeys"

doc.save(OUT)
print(OUT)
