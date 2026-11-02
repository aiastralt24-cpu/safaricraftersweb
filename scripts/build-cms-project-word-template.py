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

doc.add_heading('Project content template',0)
doc.add_paragraph('Use this form to create or update Safari Crafters project drafts. Complete the value cells, upload the document when project imports are available, then review the proposed content before saving. Importing does not publish a project.')
meta=doc.add_table(rows=1,cols=3)
for cell,value in zip(meta.rows[0].cells,['CMSProject','1.0','project']):cell.text=value
style(meta.rows[0],True)
doc.add_paragraph('Keep the identity table above and all field names unchanged.')
for title,body in [
 ('Create a project','Complete Pages with a new recordId, operation create, slug, title and locale. Leave expectedRevision blank. Use the same recordId in all related tables. English uses en.'),
 ('Update a project','Use the existing CMS record UUID, operation update and latest expectedRevision UUID. Keep its URL slug and locale unchanged. Omitted Content fields are preserved; a supplied Content row with an empty value clears that scalar field.'),
 ('Replace content deliberately','To replace or clear body, challenge, approach, outcomes, gallery, image, seo.socialImage, claims or relationships.GROUP, list those exact names in replaceCollections, separated by commas. Listed fields without new rows are cleared. GROUP is projects, products, destinations or documents. Omitted collections are preserved.'),
 ('Add more content','Copy an entire record table to add a paragraph, image, claim or another field. Give ordered items unique itemId values and positive whole-number positions. Leave unused tables completely blank. ListItems must refer to a list block itemId in blockId.'),
 ('Images and limits','Upload images in the CMS first and use their asset IDs. Do not embed images, formulas, fields or tracked changes. Maximum 25 projects, 500 total records and a 5 MB file. Character limits include spaces; the importer reports excess text without shortening it.'),
]:doc.add_heading(title,2);doc.add_paragraph(body)

doc.add_page_break();doc.add_heading('Content fields and limits',1)
doc.add_paragraph('In Content, enter one field name and its value per record table. Repeat recordId for every row. Use true or false for booleans and YYYY-MM-DD for dates. Values below are maximum character counts, not text to paste into value cells.')
for key,rule in schema['contentFields'].items():
    suffix=''
    if rule.get('guidance'):suffix=f"; recommended {rule['guidance']['max']} {rule['guidance']['unit']}"
    doc.add_paragraph(f"{key}  —  {rule['max']} characters{suffix}")
doc.add_paragraph('kind choices: project or caseStudy. SEO choices: indexing inherit/index/noindex; following inherit/follow/nofollow; sitemap inherit/include/exclude. Canonical URLs must use HTTPS. Other languages remain drafts until delivery supports them.')
notes={
 'Pages':('Project identity','Required: recordId, operation, slug, title and locale. Title: 200 characters; slug: 100. expectedRevision is required only for updates.'),
 'Content':('One content field','Use a field from the guide. Maximum 10000 characters per value, with tighter limits for individual fields. Copy this complete table for each additional field.'),
 'Blocks':('One project block','Choose section body, challenge, approach or outcomes and kind paragraph, list, quote, table or link. Paragraph/quote text: 10000 characters; attribution: 200. Tables use caption (500) and Tables records. Lists use ordered true/false and ListItems. Links use label (200) and href (2048).'),
 'Tables':('One table header or row','Create a table block in Blocks with its caption. Copy this form once for the header and once per data row, using the same blockId. Set role to header or row. Fill column1 through column8. Leave unused trailing columns empty. Headers must be consecutive and nonempty, up to 200 characters each. Row cells allow 5000 characters, including empty cells. Use distinct itemId and position values within each role. Maximum 8 columns and 50 data rows.'),
 'ListItems':('One list entry','blockId is the itemId of a list block in this file. text is required, up to 2000 characters. Use unique positions and item IDs within each list. Maximum 50 entries per list.'),
 'Media':('One image placement','Choose role image, gallery or seo.socialImage. assetId and decorative true/false are required. alt: 500 characters; caption: 2000; credit: 500. Only one image per single placement; up to 30 gallery images.'),
 'Relationships':('One related record','Choose group projects, products, destinations or documents. targetId must be the CMS record UUID. Up to 30 records per group. Availability and permissions are checked by the CMS.'),
 'Claims':('One draft claim','itemId must be a unique UUID. statement: 2000 characters; approvalContact: 200; reviewOn: YYYY-MM-DD. Up to 30 claims. Importing a contact or evidence never assigns a reviewer or approves a claim.'),
 'Evidence':('One supporting document','claimId must match a Claims itemId in this file. targetId is the supporting CMS document UUID. Up to 30 documents per claim. Use unique item IDs and positions.'),
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
output=root/'public/cms/templates/project-v1.docx';doc.save(output)
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
doc.save(root/'tests/fixtures/project-v1-filled.docx')
print(output)
