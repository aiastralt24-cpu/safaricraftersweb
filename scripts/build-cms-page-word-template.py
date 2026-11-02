"""Build page Word blank template and parser fixture using bundled Python.
Usage: python SCRIPT REPOSITORY SCHEMA_JSON
"""
import json, sys
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

doc.add_heading('Website page content template',0)
doc.add_paragraph('Use this form to create or update English custom pages. Complete the amber value cells, upload the file in Pages, then review and save the proposed drafts. Importing never publishes or adds a menu entry.')
meta=doc.add_table(rows=1,cols=3)
for cell,value in zip(meta.rows[0].cells,['CMSPage','1.0','page']):cell.text=value
style(meta.rows[0],True)
doc.add_paragraph('Keep the identity table above and all field names unchanged.')
for title,body in [
 ('Create a page','Complete Pages with a unique recordId, operation create, a new custom path such as /field-guide, title and locale en. Leave expectedRevision blank. Use the same recordId in every related table. Reserved website URLs cannot be imported.'),
 ('Update a page','Use the existing CMS record UUID and latest expectedRevision UUID. Keep its path and language unchanged. Metadata-only updates retain existing sections. Supplied blank SEO values clear that field; omitted SEO fields remain unchanged.'),
 ('Replace sections deliberately','Set replaceSections to true before supplying section rows on update. This replaces the entire section list, including omitted sections. Review all removals before saving.'),
 ('Add more content','Copy an entire record table for each additional section, paragraph, image or field. Connect child content using recordId and sectionId. Give ordered items unique IDs and positive positions. Leave unused tables completely blank.'),
 ('Images documents and limits','Use existing approved CMS image IDs and exact published document/version UUIDs. Do not embed files, fields, formulas or tracked changes. Maximum 25 pages, 500 data records and 5 MB. Limits count characters including spaces; nothing is shortened automatically.'),
]:doc.add_heading(title,2);doc.add_paragraph(body)

doc.add_page_break();doc.add_heading('Content fields and limits',1)
doc.add_paragraph('SectionContent supplies one field per table. Copy the table for more fields. Use only fields supported by the section kind. Blocks holds paragraphs, lists and links. The limits below count characters including spaces.')
for table_name, fields in [('SectionContent',schema['contentFields']),('SEO',schema['seoFields'])]:
    doc.add_heading(table_name,2)
    for key,rule in fields.items():
        suffix=f"; recommended {rule['recommended']}" if rule.get('recommended') else ''
        doc.add_paragraph(f"{key}: maximum {rule['max']} characters{suffix}")
doc.add_paragraph('SEO choices: indexing inherit/index/noindex; following inherit/follow/nofollow; sitemap inherit/include/exclude. Canonical URLs must use HTTPS.')
doc.add_page_break();doc.add_heading('Section guide',1)
for heading,body in [
 ('Hero','kind hero. Supply title and copy in SectionContent, a desktop image in Images and optionally a mobile image and up to two Buttons.'),
 ('Text','kind text. Use an optional title in SectionContent and paragraphs, lists or links in Blocks. Connect list entries in ListItems using blockId.'),
 ('Image and text','kind imageText. Supply title, Blocks, one Images row with target image and optionally one Button.'),
 ('Cards','kind cards. Supply title and columns 2, 3 or 4 in SectionContent. Add Cards rows. Card images use target card and the matching itemId.'),
 ('Call to action','kind cta. Supply title, copy and one or two Buttons. Button and card link labels are limited to 30 characters.'),
 ('Downloads','kind downloads. Supply title and Downloads rows containing documentId and the exact published versionId. File access is checked again when saving.'),
 ('Controls','headingLevel h1/h2/h3; visible true/false; background paper/white/forest/ink; width reading/content/full; spacing compact/standard/generous; textAlign start/center; mediaAlign start/end; mobileOrder textFirst/mediaFirst; animation none/fade/reveal. Visibility dates use ISO timestamps with timezone. Anchors start with a lowercase letter and contain only lowercase letters, digits and hyphens.'),
 ('Simple example','Pages: recordId guide, operation create, path /field-guide, title Field guide, locale en. Sections: guide, intro, position 1, kind text, label Introduction, headingLevel h1. SectionContent: guide, intro, field title, value Field guide. Blocks: guide, intro, itemId paragraph-1, position 1, kind paragraph, text Your approved introductory copy.'),
]:doc.add_heading(heading,2);doc.add_paragraph(body)
notes={
 'Pages':('Page identity','Required: recordId, operation, path, title and locale. For updates, also supply expectedRevision. Choose a new custom URL for creates.'),
 'Sections':('One page section','Choose hero, text, imageText, cards, cta or downloads. sectionId and position must be unique within the page. Use one h1 for the main heading.'),
 'SectionContent':('One section field','Use a field from the field guide. Only supply fields supported by the section kind. Copy this table for each field.'),
 'Blocks':('One text block','kind is paragraph, list or link. Paragraphs use text. Lists use ordered true/false and ListItems. Links use label, href and optional style text/button. Fill only fields for the chosen kind.'),
 'ListItems':('One list entry','blockId refers to a list block itemId in this section. Supply a unique itemId and position within that list.'),
 'Cards':('One card','Supply a title and optional copy, eyebrow and link. A link needs both label and href. Images connect through the card itemId.'),
 'Images':('One image placement','Use target desktop/mobile for hero, image for imageText, or card with a matching itemId. Nondecorative images need alternative text. Use a processed CMS image ID.'),
 'Buttons':('One action button','Supply label and href. Use true/false for newWindow. Maximum two per hero/cta, one for imageText.'),
 'Downloads':('One document download','Supply a label, published documentId and exact versionId. Use unique itemId and position within the download section.'),
 'SEO':('One SEO field','Use a field from the SEO guide. Omitted fields are retained on update. A supplied blank value clears that field.'),
}
tables={}
for name,fields in schema['sheets'].items():
    doc.add_page_break();title,note=notes[name];doc.add_heading(title,1);doc.add_paragraph(note)
    doc.add_paragraph('Character limits: '+ '; '.join(f"{f['key']} {f['max']}" for f in fields)+'.',style='Caption')
    table=doc.add_table(rows=2,cols=2);table.alignment=WD_TABLE_ALIGNMENT.CENTER;table.autofit=False
    table.columns[0].width=Inches(2.1);table.columns[1].width=Inches(4.9)
    for row,values in zip(table.rows,[[name,'record'],['field','value']]):
        for cell,value in zip(row.cells,values):cell.text=value
        style(row,True)
        repeat=OxmlElement('w:tblHeader');row._tr.get_or_add_trPr().append(repeat)
    for field in fields:
        row=table.add_row();row.cells[0].text=field['key'];row.cells[0].width=Inches(2.1);row.cells[1].width=Inches(4.9);style(row)
    tables[name]=table
    doc.add_paragraph('Type only in the value column. Copy the whole table to add another record.',style='Caption')
output=root/'public/cms/templates/page-v1.docx';doc.save(output)
samples={
 'Pages':{'recordId':'page-example','operation':'create','path':'/field-guide','title':'Field guide','locale':'en'},
 'Sections':{'recordId':'page-example','sectionId':'intro','position':'1','kind':'text','label':'Introduction','headingLevel':'h1'},
 'SectionContent':{'recordId':'page-example','sectionId':'intro','field':'title','value':'Field guide'},
 'Blocks':{'recordId':'page-example','sectionId':'intro','itemId':'paragraph-1','position':'1','kind':'paragraph','text':'Original text\nSecond line'},
}
for name,values in samples.items():
    for row in tables[name].rows[2:]:row.cells[1].text=values.get(row.cells[0].text,'')
doc.save(root/'tests/fixtures/page-v1-filled.docx')
print(output)
