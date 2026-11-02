"""Build expedition Word blank template and parser fixture using bundled Python.
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
    doc.styles[name].font.color.rgb = RGBColor(0,0,0)
    doc.styles[name].paragraph_format.keep_with_next = True

def shade(cell, color):
    element = OxmlElement('w:shd'); element.set(qn('w:fill'),color); cell._tc.get_or_add_tcPr().append(element)
def style(row, header=False):
    row.height = Pt(25)
    no_split=OxmlElement('w:cantSplit'); row._tr.get_or_add_trPr().append(no_split)
    for i, cell in enumerate(row.cells):
        cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        shade(cell,'374151' if header else 'F3F4F6' if i==0 else 'FFFFFF')
        borders=OxmlElement('w:tcBorders')
        for edge in ['top','left','bottom','right']:
            border=OxmlElement('w:'+edge);border.set(qn('w:val'),'single');border.set(qn('w:sz'),'4');border.set(qn('w:color'),'D9D9D9');borders.append(border)
        cell._tc.get_or_add_tcPr().append(borders)
        for p in cell.paragraphs:
            p.paragraph_format.space_before=Pt(4);p.paragraph_format.space_after=Pt(4)
            for run in p.runs:
                run.font.size=Pt(10)
                if header:run.font.bold=True;run.font.color.rgb=RGBColor(255,255,255)

doc.add_heading('Photography expedition content template',0)
doc.add_paragraph('Use this form to create or update Safari Crafters expedition drafts. Complete the value cells, upload the document when expedition imports are available, then review the proposed content before saving. Importing does not publish an expedition.')
meta=doc.add_table(rows=1,cols=3)
for cell,value in zip(meta.rows[0].cells,['CMSExpedition','1.0','photoExpedition']):cell.text=value
style(meta.rows[0],True)
doc.add_paragraph('Keep the identity table above and all field names unchanged.')
for title,body in [
 ('Create an expedition','Complete Pages with a new recordId, operation create, slug, title and locale. Leave expectedRevision blank. Use the same recordId in all related tables. English uses en.'),
 ('Update an expedition','Use the existing CMS record UUID, operation update and latest expectedRevision UUID. Keep its URL slug and locale unchanged. Omitted Content fields are preserved; a supplied Content row with an empty value clears that scalar field.'),
 ('Replace content deliberately','To replace or clear departures, days, highlights, inclusions, exclusions, body, faqs, image, heroImage, mobileHeroImage, gallery, seo.socialImage, specialists, enquiry.form, video or video.poster, list those exact names in replaceCollections, separated by commas. Listed fields without new rows are cleared. Omitted collections are preserved.'),
 ('Add more content','Copy an entire record table to add a departure, day, image or another field. Give ordered items unique itemId values and positive whole-number positions. Leave unused tables completely blank. Dates use YYYY-MM-DD. Prices and dateLabel retain exact wording.'),
 ('Images and limits','Upload images in the CMS first and use their asset IDs. Do not embed images, formulas, fields or tracked changes. Maximum 25 expeditions, 500 total records and a 5 MB file. Character limits include spaces; the importer reports excess text without shortening it.'),
]:doc.add_heading(title,2);doc.add_paragraph(body)

doc.add_page_break();doc.add_heading('Content fields and limits',1)
doc.add_paragraph('In Content, enter one field name and its value per record table. Repeat recordId for every row. Use true or false for booleans and YYYY-MM-DD for dates. Values below are maximum character counts, not text to paste into value cells.')
for key,rule in schema['contentFields'].items():
    suffix=''
    if rule.get('guidance'):suffix=f"; recommended {rule['guidance']['max']} {rule['guidance']['unit']}"
    doc.add_paragraph(f"{key}  —  {rule['max']} characters{suffix}")
doc.add_paragraph('SEO choices: indexing inherit/index/noindex; following inherit/follow/nofollow; sitemap inherit/include/exclude. Canonical URLs and source URLs must use HTTPS. Expedition imports currently require English locale en. Programme status is preview or confirmed; neither publishes a draft. Geography is India or International. Replacing video includes its poster. Do not also list video.poster.')
notes={
 'Pages':('Expedition identity','Required: recordId, operation, slug, title and locale en. expectedRevision is required only for updates. Use a new short import ID for create, or the existing CMS record UUID for update.'),
 'Content':('One content field','Choose a field from the guide. Use its exact field name and repeat recordId. Values have field-specific character limits. Copy this complete table for each additional field.'),
 'Departures':('One departure','Required start date in YYYY-MM-DD. Optional endDate must be on or after the start. Status: New, Filling fast, Full or Available. Keep availability wording up to 200 characters. Maximum 200 departures.'),
 'Days':('One itinerary day','Required title up to 200 characters and copy up to 10000. Optional label and stay each up to 200. Maximum 100 days.'),
 'Lists':('One list entry','Choose collection highlights, inclusions, exclusions or body. text is required, up to 10000 characters. Up to 100 entries per collection.'),
 'FAQs':('One question and answer','question is required, up to 500 characters. answer is required, up to 10000. Maximum 100 FAQs.'),
 'Media':('One image placement','Choose image, heroImage, mobileHeroImage, gallery, video.poster or seo.socialImage. Use an uploaded CMS assetId and decorative true or false. alt is required for meaningful images. alt: 500 characters; caption: 2000; credit: 500. Maximum 100 gallery images.'),
 'References':('One related record','Choose mentor or guide for a specialist, or enquiryForm for a form. targetId must be its CMS record UUID. Maximum 20 specialist roles and one enquiry form. The same specialist may hold both roles.'),
 'Films':('One film','Use processed video and captions IDs, title, optional caption and transcript. Add its poster in Media with role video.poster. Film import saving remains unavailable until media verification is connected. Leave this table blank for now.'),
}
tables={}
for name,fields in schema['sheets'].items():
    doc.add_page_break();title,note=notes[name];doc.add_heading(title,1);doc.add_paragraph(note)
    doc.add_paragraph('Column limits: '+ '; '.join(f"{f['key']} {f['max']}" for f in fields)+' characters. Required fields are checked during import.')
    table=doc.add_table(rows=2,cols=2);table.alignment=WD_TABLE_ALIGNMENT.CENTER;table.autofit=False
    table.columns[0].width=Inches(2.1);table.columns[1].width=Inches(4.9)
    for row,values in zip(table.rows,[[name,'record'],['field','value']]):
        for cell,value in zip(row.cells,values):cell.text=value
        style(row,True)
    for field in fields:
        row=table.add_row();row.cells[0].text=field['key'];row.cells[0].width=Inches(2.1);row.cells[1].width=Inches(4.9);style(row)
    tables[name]=table
    doc.add_paragraph('Type only in the value column. Copy the whole table to add another record.',style='Caption')
output=root/'public/cms/templates/expedition-v1.docx';doc.save(output)
samples={
 'Pages':{'recordId':'expedition-word-example','operation':'create','slug':'word-forest','title':'Forest expedition','locale':'en'},
 'Content':{'recordId':'expedition-word-example','field':'intro','value':'Original paragraph with a line break.\nSecond line remains intact.'},
 'Departures':{'recordId':'expedition-word-example','itemId':'departure-1','position':'1','date':'2028-02-29','endDate':'2028-03-03','status':'Full','availability':'Waitlist'},
}
for name,values in samples.items():
    for row in tables[name].rows[2:]:row.cells[1].text=values.get(row.cells[0].text,'')
doc.save(root/'tests/fixtures/expedition-v1-filled.docx')
print(output)
