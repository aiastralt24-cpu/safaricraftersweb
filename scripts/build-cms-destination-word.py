"""Bundled Python: script REPOSITORY SCHEMA_JSON. Uses destination contract export."""
import json
import sys
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT

root, schema_path = map(Path, sys.argv[1:3])
schema = json.loads(schema_path.read_text())
doc = Document()
section = doc.sections[0]
section.page_width, section.page_height = Inches(8.27), Inches(11.69)
section.top_margin = section.bottom_margin = Inches(.65)
section.left_margin = section.right_margin = Inches(.7)
normal = doc.styles['Normal']
normal.font.name, normal.font.size = 'Arial', Pt(11)
normal.paragraph_format.space_after = Pt(8)
for name in ['Title', 'Heading 1', 'Heading 2']:
    doc.styles[name].font.name = 'Arial'
    doc.styles[name].font.color.rgb = RGBColor(0, 0, 0)
doc.styles['Title'].font.size = Pt(26)
doc.styles['Heading 1'].font.size = Pt(20)
for style in doc.styles:
    for border in style.element.xpath('.//w:pBdr'):
        border.getparent().remove(border)

def style_table(table):
    table.autofit = False
    for index, row in enumerate(table.rows):
        props = row._tr.get_or_add_trPr()
        props.append(OxmlElement('w:cantSplit'))
        for cell in row.cells:
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cp = cell._tc.get_or_add_tcPr()
            shade = OxmlElement('w:shd')
            shade.set(qn('w:fill'), '334155' if index < 2 else ('F1F5F9' if index % 2 == 0 else 'FFFFFF'))
            cp.append(shade)
            borders = OxmlElement('w:tcBorders')
            for edge in ['top', 'left', 'bottom', 'right']:
                border = OxmlElement('w:' + edge)
                for key, value in [('val', 'single'), ('sz', '4'), ('color', 'D9D9D9')]:
                    border.set(qn('w:' + key), value)
                borders.append(border)
            cp.append(borders)
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(6)
                p.paragraph_format.space_after = Pt(6)
                for run in p.runs:
                    run.font.size = Pt(11)
                    if index < 2:
                        run.font.bold = True
                        run.font.color.rgb = RGBColor(255, 255, 255)

doc.add_heading('Destination content template', 0)
doc.add_paragraph('Use this form to prepare destination page drafts for Safari Crafters. Complete the value cells and copy an entire record table when adding another item. Upload and saving will be available after CMS integration.')
metadata = doc.add_table(rows=1, cols=3)
for cell, value in zip(metadata.rows[0].cells, ['CMSDestination', schema['version'], 'destination']):
    cell.text = value
style_table(metadata)
for title, body in [
    ('Create or update', 'Create requires a new temporary recordId, operation create, slug, title and locale en. For updates, use the CMS record UUID and exact current revision. Keep the slug and language unchanged.'),
    ('Preserve or clear content', 'Omit a Content record to keep its existing value. A Content record with an empty value explicitly clears that field. Leave unused record tables completely blank.'),
    ('Replace collections', 'For updates, list collection names in Pages replaceCollections, separated by commas. Supply all replacement items. A listed collection with no rows is cleared. Unlisted collections stay unchanged.'),
    ('Collection names', 'bestFor, highlights, image, heroImage, gallery, seo.socialImage, journeys, expeditions, pairings, faqs, sources, editorial.scoop'),
    ('File rules', 'Keep metadata and field names unchanged. Use plain text and dates in YYYY-MM-DD format. Do not add tracked changes, fields, merged cells or embedded images. Use CMS asset IDs and related record UUIDs. Maximum 500 records and 5 MB. Imports prepare drafts and never publish automatically.'),
]:
    doc.add_heading(title, 2)
    doc.add_paragraph(body)

notes = {
    'Pages': ('Destination details', 'Complete every required field. Leave expectedRevision blank for create. For updates, copy the exact current revision from the CMS.'),
    'Content': ('A content field', 'Use one table per scalar field. Common paths include intro, description, country, bestMonths, seo.title and editorial.openingHeadline. All supported paths and limits appear in the reference at the end.'),
    'Lists': ('A list item', 'Choose bestFor or highlights. Use the destination recordId and a unique itemId and positive position within the collection.'),
    'Media': ('An image placement', 'Choose image, heroImage, gallery or seo.socialImage. Use a CMS asset ID. decorative must be true or false. Nondecorative images need alternative text.'),
    'Related': ('A related page', 'Choose journey, photoExpedition or destination. targetId is a CMS record UUID. title and reason apply only to destination pairings.'),
    'FAQs': ('A guest question', 'Write a verified answer. Aim for no more than 120 words. This is guidance; the hard limit is 10000 characters.'),
    'Sources': ('A research source', 'Use an HTTPS source URL. Enter accessedAt as YYYY-MM-DD. publisher is optional.'),
    'Notes': ('An editorial note', 'Use a short title and optional blurb and body. These items replace the editorial.scoop collection when explicitly requested.'),
}
tables = {}
for name, fields in schema['sheets'].items():
    doc.add_page_break()
    title, note = notes[name]
    doc.add_heading(title, 1)
    doc.add_paragraph(note)
    table = doc.add_table(rows=2, cols=2)
    table.columns[0].width, table.columns[1].width = Inches(2), Inches(4.8)
    table.cell(0, 0).text, table.cell(0, 1).text = name, 'record'
    table.cell(1, 0).text, table.cell(1, 1).text = 'field', 'value'
    for field in fields:
        cells = table.add_row().cells
        cells[0].text = field['key']
        cells[0].width, cells[1].width = Inches(2), Inches(4.8)
    style_table(table)
    tables[name] = table
    hint = doc.add_paragraph('Type only in the value column. Copy the entire table for another record.')
    hint.paragraph_format.space_before = Pt(8)
    doc.add_heading('Field limits', 2)
    doc.add_paragraph('; '.join(f"{f['key']}: maximum {f.get('max', '')} characters" + (' (required)' if f.get('required') else '') for f in fields) + '.')

doc.add_page_break()
doc.add_heading('Content field reference', 1)
doc.add_paragraph('Use these exact paths in Content field cells. Limits count characters, including spaces. Recommended lengths are guidance and do not shorten your content automatically.')
for name, rule in schema['contentFields'].items():
    guidance = rule.get('guidance')
    doc.add_paragraph(f"{name}: maximum {rule['max']} characters" + (f". Recommended {guidance['max']} {guidance['unit']}" if guidance else '') + '.')
output = root / 'public/cms/templates/destination-v1.docx'
doc.save(output)
samples = {'Pages': {'recordId':'destination-word-example','operation':'create','slug':'word-forest','title':'Word forest example','locale':'en'}, 'Content': {'recordId':'destination-word-example','field':'intro','value':'Example introduction for parser verification only.'}}
for name, values in samples.items():
    for row in tables[name].rows[2:]:
        row.cells[1].text = values.get(row.cells[0].text, '')
doc.save(root / 'tests/fixtures/destination-v1-filled.docx')
print(output)
