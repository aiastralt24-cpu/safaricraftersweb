"""Run with bundled Python: script REPOSITORY SCHEMA_JSON FIXTURE_OUTPUT."""
import json
import sys
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE

root, schema_path, fixture_path = map(Path, sys.argv[1:4])
schema = json.loads(schema_path.read_text())
doc = Document()
section = doc.sections[0]
section.page_width, section.page_height = Inches(8.27), Inches(11.69)
section.top_margin = section.bottom_margin = Inches(.65)
section.left_margin = section.right_margin = Inches(.7)
normal = doc.styles['Normal']
normal.font.name, normal.font.size = 'Arial', Pt(10)
normal.paragraph_format.space_after = Pt(7)
for name in ['Title', 'Heading 1', 'Heading 2']:
    doc.styles[name].font.name = 'Arial'
    doc.styles[name].font.color.rgb = RGBColor.from_string('234638')
doc.styles['Title'].font.size = Pt(28)
doc.styles['Heading 1'].font.size = Pt(20)
for name in ['Caption', 'Subtitle']:
    doc.styles[name].font.name = 'Arial'
    doc.styles[name].font.color.rgb = RGBColor.from_string('607568')
section.header.paragraphs[0].text = 'SAFARI CRAFTERS  /  CONTENT WORKSPACE'
section.header.paragraphs[0].style = 'Caption'
section.footer.paragraphs[0].text = 'Journey template v1.0  ·  Draft content only'
section.footer.paragraphs[0].style = 'Caption'

def fill(cell, color):
    element = OxmlElement('w:shd')
    element.set(qn('w:fill'), color)
    cell._tc.get_or_add_tcPr().append(element)

def style_row(row, header=False):
    for cell in row.cells:
        fill(cell, '234638' if header else 'FFF6DC')
        for paragraph in cell.paragraphs:
            paragraph.paragraph_format.space_after = Pt(4)
            paragraph.paragraph_format.space_before = Pt(4)
            for run in paragraph.runs:
                run.font.size = Pt(10)
                if header:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(255, 255, 255)
        borders = OxmlElement('w:tcBorders')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '4')
        bottom.set(qn('w:color'), 'FFFFFF')
        borders.append(bottom)
        cell._tc.get_or_add_tcPr().append(borders)
    row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
    row.height = Pt(23)
    no_split = OxmlElement('w:cantSplit')
    row._tr.get_or_add_trPr().append(no_split)

doc.add_heading('Write your next journey', 0)
doc.add_paragraph('A structured Word template for creating and updating journey pages.', style='Subtitle')
doc.add_heading('Template identity', 2)
metadata = doc.add_table(rows=1, cols=3)
for cell, value in zip(metadata.rows[0].cells, ['CMSJourney', '1.0', 'journey']):
    cell.text = value
style_row(metadata.rows[0], True)
doc.add_paragraph('Keep this identity table and all field names unchanged.')
for title, body in [
    ('1. Complete the journey', 'Fill the value column in the Pages table that follows. For a new page, choose a stable recordId, set operation to create and leave expectedRevision blank. For an update, use the CMS record UUID and its latest revision UUID.'),
    ('2. Add itinerary, questions and images', 'The final three pages contain optional record tables. Copy an entire table to add another day, FAQ or image. Use the same recordId as the journey and give each item a unique itemId and position. Leave unused tables completely blank.'),
    ('3. Review before saving', 'Upload this document to the CMS, review its errors, warnings and proposed changes, then save drafts. Importing never publishes a page. Blank update values keep existing content; omitted items are retained.'),
    ('Writing guidance', 'Title: 30–80 characters. Summary: 25–50 words. Introduction: 100–250 words. Itinerary description: 40–150 words. FAQ answer: 30–120 words. Image alt text: 10–25 words. These are recommendations, not automatic cuts.'),
    ('Limits and file rules', 'Button labels must not exceed 30 characters, including spaces. Use plain text without formulas, fields, tracked changes or embedded images. Upload images through the CMS and paste their asset IDs. Maximum 500 records across all tables; file size up to 5 MB.'),
]:
    doc.add_heading(title, 2)
    doc.add_paragraph(body)

notes = {
    'Pages': ('Journey details', 'Required for create: recordId, operation, slug, title, description, intro, region, duration and bestMonths. SEO guidance: title 50–60 characters; description 140–160 characters.'),
    'Itinerary': ('An itinerary day', 'Complete all fields except stay. position is a positive whole number. copy is the day description; aim for 40–150 words. Duplicate this complete table for another day.'),
    'FAQs': ('A guest question', 'Complete every field. Use a unique itemId and position. Write a verified answer of approximately 30–120 words. Duplicate this complete table for another question.'),
    'Media': ('An image placement', 'Complete recordId, itemId, position, role, assetId and alt. Choose hero, mobileHero or gallery. Use a separate mobileHero image when needed. caption and credit are optional.'),
}
tables = {}
for name, fields in schema['sheets'].items():
    doc.add_page_break()
    title, note = notes[name]
    doc.add_heading(title, 1)
    doc.add_paragraph(note)
    table = doc.add_table(rows=2, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width, table.columns[1].width = Inches(1.8), Inches(5.0)
    table.rows[0].cells[0].text, table.rows[0].cells[1].text = name, 'record'
    table.rows[1].cells[0].text, table.rows[1].cells[1].text = 'field', 'value'
    for row in table.rows:
        style_row(row, True)
    for field in fields:
        row = table.add_row()
        row.cells[0].text = field['key']
        row.cells[0].width, row.cells[1].width = Inches(1.8), Inches(5.0)
        style_row(row)
        fill(row.cells[0], 'F0F4EF')
        if name != 'Pages' and field['key'] in ['copy', 'answer', 'alt']:
            row.height = Pt(90)
    tables[name] = table
    doc.add_paragraph('Type only in the value column. Keep field names unchanged.', style='Caption')

output = root / 'public/cms/templates/journey-v1.docx'
doc.save(output)
sample = {'recordId':'journey-word-example','operation':'create','slug':'word-example','title':'A private journey through the forest','description':'Example summary for parser testing only.','intro':'Example introduction for parser testing only.','region':'Example region','duration':'5 nights','bestMonths':'To be confirmed','buttonLabel':'Plan this journey'}
for row in tables['Pages'].rows[2:]:
    row.cells[1].text = sample.get(row.cells[0].text, '')
doc.save(fixture_path)
print(output)
