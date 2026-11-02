"""Build application Word blank template and parser fixture using bundled Python.
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
    doc.styles[name].font.color.rgb = RGBColor.from_string('000000')
    doc.styles[name].paragraph_format.keep_with_next = True

def shade(cell, color):
    element = OxmlElement('w:shd'); element.set(qn('w:fill'),color); cell._tc.get_or_add_tcPr().append(element)
def style(row, header=False):
    row.height = Pt(25)
    no_split=OxmlElement('w:cantSplit'); row._tr.get_or_add_trPr().append(no_split)
    for i, cell in enumerate(row.cells):
        cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        shade(cell,'243746' if header else 'F0F4EF' if i==0 else 'FFF8E7')
        for p in cell.paragraphs:
            p.paragraph_format.space_before=Pt(4);p.paragraph_format.space_after=Pt(4)
            for run in p.runs:
                run.font.size=Pt(10)
                if header:run.font.bold=True;run.font.color.rgb=RGBColor(255,255,255)

doc.add_heading('Product category content template',0)
doc.add_paragraph('Create or update category drafts and their attribute definitions. Fill the value cells, upload this file in Product categories, review the changes and save drafts. Importing does not publish content.')
meta=doc.add_table(rows=1,cols=3)
for cell,value in zip(meta.rows[0].cells,['CMSProductCategory','1.0','productCategory']):cell.text=value
style(meta.rows[0],True)
for title,body in schema['instructions']:
    doc.add_heading(title,2);doc.add_paragraph(body)
doc.add_page_break();doc.add_heading('Content fields and limits',1)
for key,rule in schema['contentFields'].items():
    suffix=f". Recommended {rule['guidance']['max']} {rule['guidance']['unit']}" if rule.get('guidance') else ''
    doc.add_paragraph(f"{key}: maximum {rule['max']} characters{suffix}")
doc.add_paragraph('SEO values: indexing inherit, index or noindex; following inherit, follow or nofollow; sitemap inherit, include or exclude. Canonical URLs require HTTPS. Character limits include spaces. Excess text is reported, never shortened.')
tables={}
for name,fields in schema['sheets'].items():
    doc.add_page_break();doc.add_heading(name+' record',1)
    doc.add_paragraph('Type only in the value column. Copy this entire table for another record. Leave unused tables entirely blank. Keep field names and identity rows unchanged.')
    doc.add_paragraph('Limits: '+ '; '.join(f"{f['key']} {f['max']}" for f in fields)+ ' characters. Required fields: '+ ', '.join(f['key'] for f in fields if f.get('required'))+'.')
    table=doc.add_table(rows=2,cols=2);table.alignment=WD_TABLE_ALIGNMENT.CENTER;table.autofit=False
    table.columns[0].width=Inches(2.1);table.columns[1].width=Inches(4.9)
    for row,values in zip(table.rows,[[name,'record'],['field','value']]):
        for cell,value in zip(row.cells,values):cell.text=value
        style(row,True)
    for field in fields:
        row=table.add_row();row.cells[0].text=field['key'];row.cells[0].width=Inches(2.1);row.cells[1].width=Inches(4.9);style(row)
    tables[name]=table
# Explicit visible table borders and cell padding.
for table in doc.tables:
    props=table._tbl.tblPr
    borders=OxmlElement('w:tblBorders')
    for edge in ['top','left','bottom','right','insideH','insideV']:
        el=OxmlElement('w:'+edge);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');borders.append(el)
    props.append(borders)
    margins=OxmlElement('w:tblCellMar')
    for edge in ['top','left','bottom','right']:
        el=OxmlElement('w:'+edge);el.set(qn('w:w'),'100');el.set(qn('w:type'),'dxa');margins.append(el)
    props.append(margins)
doc.save(root/'public/cms/templates/product-category-v1.docx')
for name,records in schema['samples'].items():
    assert len(records)==1
    for row in tables[name].rows[2:]:
        row.cells[1].text=str(records[0].get(row.cells[0].text,''));style(row)
doc.save(root/'tests/fixtures/product-category-v1-filled.docx')
