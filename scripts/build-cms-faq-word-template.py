"""Build project Word blank template and parser fixture using bundled Python.
Usage: python SCRIPT REPOSITORY SCHEMA_JSON
"""
import json, sys
from copy import deepcopy
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
root, schema_file = map(Path, sys.argv[1:3])
schema = json.loads(schema_file.read_text())
doc = Document()
section = doc.sections[0]
section.page_width, section.page_height = Inches(8.5), Inches(11)
section.top_margin = section.bottom_margin = Inches(.65)
section.left_margin = section.right_margin = Inches(.75)
for name in ['Normal','Title','Heading 1','Heading 2','Caption']:
    doc.styles[name].font.name = 'Arial'
doc.styles['Normal'].font.size = Pt(11)
doc.styles['Normal'].paragraph_format.space_after = Pt(7)
for node in list(doc.styles.element.iter(qn('w:pBdr'))):
    node.getparent().remove(node)
doc.styles['Caption'].font.color.rgb = RGBColor.from_string('607568')
doc.styles['Caption'].font.bold = False
doc.styles['Title'].font.size = Pt(26)
doc.styles['Title'].font.color.rgb = RGBColor(0,0,0)
for name in ['Heading 1','Heading 2']:
    doc.styles[name].font.color.rgb = RGBColor.from_string('234638')
    doc.styles[name].paragraph_format.keep_with_next = True

def shade(cell, color):
    element = OxmlElement('w:shd'); element.set(qn('w:fill'),color); cell._tc.get_or_add_tcPr().append(element)
def style(row, header=False):
    row.height = Pt(25)
    no_split=OxmlElement('w:cantSplit'); row._tr.get_or_add_trPr().append(no_split)
    for i, cell in enumerate(row.cells):
        cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        shade(cell,'234638' if header else 'F0F4EF' if i==0 else 'FFF8E7')
        for p in cell.paragraphs:
            p.paragraph_format.space_before=Pt(4);p.paragraph_format.space_after=Pt(4)
            for run in p.runs:
                run.font.size=Pt(10)
                if header:run.font.bold=True;run.font.color.rgb=RGBColor(255,255,255)

doc.add_heading('FAQ content template',0)
doc.add_paragraph('Use this form to create or update Safari Crafters FAQ drafts. Complete the value cells, upload the document when FAQ imports are available, then review the proposed content before saving. Importing does not publish an answer.')
meta=doc.add_table(rows=1,cols=3)
for cell,value in zip(meta.rows[0].cells,['CMSFaq','1.0','faq']):cell.text=value
style(meta.rows[0],True)
doc.add_paragraph('Keep the identity table above and all field names unchanged.')
for title,body in [
 ('Create an answer','Complete Pages with a new recordId, operation create, question and locale. Leave expectedRevision blank. Repeat recordId in all related tables. English uses en.'),
 ('Update an answer','Use the existing CMS record UUID and latest expectedRevision UUID. Keep its locale unchanged. Omitted Content fields are preserved; an explicit empty Content value clears that field.'),
 ('Replace collections deliberately','List answer, keywords or relationships.GROUP in replaceCollections, separated by commas. GROUP is pages, products, destinations or documents. Listed collections without new rows are cleared. Omitted collections are preserved.'),
 ('Add more content','Copy an entire record table for each paragraph, keyword or reference. Use unique itemId values and positive whole-number positions. Leave unused tables blank. ListItems refer to a list block itemId in blockId.'),
 ('Limits','Use at most 25 FAQs, 500 total records and a 5 MB file. Do not embed images, formulas, fields or tracked changes. Character limits include spaces; excess text is reported without shortening it.'),
]:doc.add_heading(title,2);doc.add_paragraph(body)

doc.add_page_break();doc.add_heading('Content fields and limits',1)
doc.add_paragraph('In Content, enter one field name and its value per record table. Repeat recordId for every row. Use true or false for booleans and YYYY-MM-DD for dates. Values below are maximum character counts, not text to paste into value cells.')
for key,rule in schema['contentFields'].items():
    suffix=''
    if rule.get('guidance'):suffix=f"; recommended {rule['guidance']['max']} {rule['guidance']['unit']}"
    doc.add_paragraph(f"{key}  —  {rule['max']} characters{suffix}")
doc.add_paragraph('Question limit is 200 characters. Topic limit is 120. Internal notes allow 2000. Review dates use YYYY-MM-DD. Other languages remain drafts until public delivery supports them.')
notes={
 'Pages':('FAQ identity','Required: recordId, operation, question and locale. Question: 200 characters. expectedRevision is required for updates only.'),
 'Content':('One content field','Use topic, reviewOn or internalNotes. Copy this entire table for each additional field. Field limits appear in the preceding guide.'),
 'Blocks':('One answer block','Choose paragraph, list, quote, table or link. Text: 10000 characters; attribution: 200. Tables use caption (500) and Tables records. Lists use ordered true/false and ListItems. Links use label (200) and href (2048).'),
 'Tables':('One table header or row','Create a table block first. Use the same blockId for one header and its ordered data rows. Fill column1 through column8; leave unused trailing columns empty. Headers must be consecutive and nonempty, up to 200 characters each. Row cells allow 5000 characters. Maximum 8 columns and 50 data rows.'),
 'ListItems':('One list entry','blockId is the itemId of a list block in this file. Text is required, up to 2000 characters. Use unique positions and item IDs per list. Maximum 50 entries.'),
 'Relationships':('One related record','Choose pages, products, destinations or documents. targetId is an existing CMS record UUID. Up to 30 records per group. The CMS checks availability and permissions.'),
 'Keywords':('One search keyword','Text is required, up to 80 characters. Use up to 20 distinct keywords. Case-only differences count as duplicates.'),
}
tables={}
for name,fields in schema['sheets'].items():
    doc.add_page_break();title,note=notes[name];doc.add_heading(title,1);doc.add_paragraph(note)
    if name in ['Blocks','ListItems']:
        doc.add_paragraph('Text formatting: select words in the text value cell and apply bold, italic, superscript or subscript directly. In Blocks this applies only to paragraph blocks. Use no more than 200 formatted parts per cell.')
        doc.add_paragraph('Supported marks also carry through document defaults and paragraph or character styles. Table-style marks, underline, strikethrough and inline hyperlinks are not supported. Use link blocks for URLs. Fonts, sizes and colors follow the website; other fields do not import formatting.')
    table=doc.add_table(rows=2,cols=2);table.alignment=WD_TABLE_ALIGNMENT.CENTER;table.autofit=False
    table.columns[0].width=Inches(2.1);table.columns[1].width=Inches(4.9)
    for row,values in zip(table.rows,[[name,'record'],['field','value']]):
        for cell,value in zip(row.cells,values):cell.text=value
        style(row,True)
    for field in fields:
        row=table.add_row();row.cells[0].text=field['key'];row.cells[0].width=Inches(2.1);row.cells[1].width=Inches(4.9);style(row)
    tables[name]=table
    doc.add_paragraph('Type only in the value column. Copy the whole table to add another record.',style='Caption')
output=root/'public/cms/templates/faq-v1.docx';doc.save(output)
# Put each synthetic record on a fresh page to retain the readable form layout.
from docx.table import Table
for name, records in schema['samples'].items():
    for index, values in enumerate(records):
        if index == 0:
            table=tables[name]
        else:
            doc.add_page_break()
            doc.add_heading(notes[name][0] + ' — example',1)
            element=deepcopy(tables[name]._tbl)
            doc._body._body.insert(len(doc._body._body)-1,element)
            table=Table(element,doc._body)
        for row in table.rows[2:]:
            row.cells[1].text=str(values.get(row.cells[0].text,''))
            style(row)
doc.save(root/'tests/fixtures/faq-v1-filled.docx')
print(output)
