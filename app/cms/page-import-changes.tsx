import type {PageImportComparison} from '../../lib/cms/page-import-comparison';
const actions={added:'Add',removed:'Remove',changed:'Change',moved:'Move',changedAndMoved:'Change and move'};
const show=(value:unknown)=>value===null||value===''?'Empty':typeof value==='string'?value:JSON.stringify(value);
export function PageImportChanges({value}:{value:PageImportComparison}){
 return <section aria-label='Import changes'><h4>Changes from the current draft</h4>
 {value.title&&<p>Page title: {value.title.before===null?'New page':`“${value.title.before}”`} → “{value.title.after}”</p>}
 {value.sections.length>0&&<ul>{value.sections.map(section=><li key={section.id}><strong>{actions[section.action]} {section.after?.label??section.before?.label}</strong>{section.before&&<span> · Previous: {section.before.kind}, position {section.before.position}</span>}{section.after&&<span> · Proposed: {section.after.kind}, position {section.after.position}</span>}{section.fields.length>0&&<p>Changed fields: {section.fields.map(field=>field.replace('controls.','Setting: ').replace('data.','Content: ')).join(', ')}.</p>}</li>)}</ul>}
 {value.seo.length>0&&<details><summary>{value.seo.length} SEO {value.seo.length===1?'change':'changes'}</summary>{value.seo.map(field=><div key={field.field}><strong>{field.field}</strong><p>Previous: {show(field.before)}</p><p>Proposed: {show(field.after)}</p></div>)}</details>}
 {!value.title&&!value.sections.length&&!value.seo.length&&<p>No content changes. Saving would still create a new draft revision.</p>}
 </section>;
}
