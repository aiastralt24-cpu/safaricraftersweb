"""Build journal Word blank template and parser fixture using bundled Python.
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

doc.add_heading('Journal article content template',0)
doc.add_paragraph('Use this form to create or update Safari Crafters journal drafts. Complete the value cells, upload the document when journal imports are available, then review the proposed content before saving. Importing does not publish an article.')
meta=doc.add_table(rows=1,cols=3)
for cell,value in zip(meta.rows[0].cells,['CMSJournal','1.0','journalArticle']):cell.text=value
style(meta.rows[0],True)
doc.add_paragraph('Keep the identity table above and all field names unchanged.')
for title,body in [
 ('Create an article','Complete Pages with a new recordId, operation create, slug, title and locale. Leave expectedRevision blank. Use the same recordId in all related tables. English uses en.'),
 ('Update an article','Use the existing CMS record UUID, operation update and latest expectedRevision UUID. Keep its URL slug and locale unchanged. Omitted Content fields are preserved; a supplied Content row with an empty value clears that scalar field.'),
 ('Replace content deliberately','To replace or clear body, gallery, sources, image, heroImage or seo.socialImage, list those exact names in replaceCollections, separated by commas. Listed fields without new rows are cleared. Omitted collections are preserved.'),
 ('Add more content','Copy an entire record table to add a paragraph, image, source or another field. Give ordered items unique itemId values and positive whole-number positions. Leave unused tables completely blank. ListItems must refer to a list block itemId in blockId.'),
 ('Images and limits','Upload images in the CMS first and use their asset IDs. Do not embed images, formulas, fields or tracked changes. Maximum 25 articles, 500 total records and a 5 MB file. Character limits include spaces; the importer reports excess text without shortening it.'),
]:doc.add_heading(title,2);doc.add_paragraph(body)

doc.add_page_break();doc.add_heading('Content fields and limits',1)
doc.add_paragraph('In Content, enter one field name and its value per record table. Repeat recordId for every row. Use true or false for booleans and YYYY-MM-DD for dates. Values below are maximum character counts, not text to paste into value cells.')
for key,rule in schema['contentFields'].items():
    suffix=''
    if rule.get('guidance'):suffix=f"; recommended {rule['guidance']['max']} {rule['guidance']['unit']}"
    doc.add_paragraph(f"{key}  —  {rule['max']} characters{suffix}")
doc.add_paragraph('SEO choices: indexing inherit/index/noindex; following inherit/follow/nofollow; sitemap inherit/include/exclude. Canonical URLs and source URLs must use HTTPS. Other languages remain drafts until delivery supports them.')
notes={
 'Pages':('Article identity','Required: recordId, operation, slug, title and locale. Title: 200 characters; slug: 100. expectedRevision is required only for updates.'),
 'Content':('One content field','Use a field from the guide. Maximum 10000 characters per value, with tighter limits for individual fields. Copy this complete table for each additional field.'),
 'Blocks':('One article block','Choose paragraph, heading, list, quote, table, link or image. Fill only fields for that kind. Paragraph/quote text: 10000 characters; heading text: 200, level h2 or h3. Tables use caption (500) and related Tables records. Lists use ordered true/false and ListItems. Quotes may have attribution (200). Links use label (200) and href (2048). Images use assetId, alt (500), decorative true/false, caption (2000) and credit (500). Maximum 200 blocks.'),
 'Tables':('One table header or row','Create a table block in Blocks with its caption. Copy this form once for the header and once per data row, using the same blockId. Set role to header or row. Fill column1 through column8. Leave unused trailing columns empty. Headers must be consecutive and nonempty, up to 200 characters each. Row cells allow 5000 characters, including empty cells. Use distinct itemId and position values within each role. Maximum 8 columns and 50 data rows.'),
 'ListItems':('One list entry','blockId is the itemId of a list block in this file. text is required, up to 2000 characters. Use unique positions and item IDs within each list. Maximum 50 entries per list.'),
 'Media':('One image placement','Choose role image, heroImage, gallery or seo.socialImage. assetId and decorative true/false are required. alt: 500 characters; caption: 2000; credit: 500. Only one image per single placement; up to 50 gallery images.'),
 'Sources':('One research source','title (200), HTTPS url (2048) and accessedAt (YYYY-MM-DD) are required. publisher (200) is optional. Maximum 100 sources.'),
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
output=root/'public/cms/templates/journal-v1.docx';doc.save(output)
samples={
 'Pages':{'recordId':'journal-word-example','operation':'create','slug':'word-forest','title':'Forest field notes','locale':'en'},
 'Content':{'recordId':'journal-word-example','field':'description','value':'A short example used to verify the template.'},
 'Blocks':{'recordId':'journal-word-example','itemId':'paragraph-1','position':'1','kind':'paragraph','text':'Original paragraph with a line break.\nSecond line remains intact.'},
}
for name,values in samples.items():
    for row in tables[name].rows[2:]:row.cells[1].text=values.get(row.cells[0].text,'')
from docx.table import Table
for name, records in {
 'Blocks':[{'itemId':'table-1','position':'2','kind':'table','caption':'Season guide'}],
 'Tables':[
  {'itemId':'head','position':'1','blockId':'table-1','role':'header','column1':'Season','column2':'Notes'},
  {'itemId':'winter','position':'2','blockId':'table-1','role':'row','column1':'Winter'},
  {'itemId':'summer','position':'1','blockId':'table-1','role':'row','column1':'Summer','column2':'Early starts\nBring water'},
 ],
}.items():
    previous=tables[name]._tbl
    for index, values in enumerate(records):
        if name=='Tables' and index==0:
            table=tables[name]
        else:
            element=deepcopy(tables[name]._tbl);previous.addnext(element);table=Table(element,tables[name]._parent)
        previous=table._tbl
        values={'recordId':'journal-word-example',**values}
        for row in table.rows[2:]:row.cells[1].text=values.get(row.cells[0].text,'')
doc.save(root/'tests/fixtures/journal-v1-filled.docx')
print(output)
