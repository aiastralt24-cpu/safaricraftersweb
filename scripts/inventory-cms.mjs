import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';

const file='docs/cms/editability-register.json';
let previous={elements:[]};try{previous=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const saved=new Map(previous.elements.map(row=>[row.id,row]));
async function walk(directory) {
 const entries=await fs.readdir(directory,{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]))).flat();
}
const all=[...await walk('app'),...await walk('components')].filter(f=>f.endsWith('.tsx')).sort();
const excludedPrefixes=['app/admin/','app/api/','app/studio/'];
const files=all.filter(f=>!excludedPrefixes.some(prefix=>f.startsWith(prefix)));
const attributes=new Set(['title','copy','label','alt','placeholder','aria-label','description','caption','headline','subheadline','eyebrow','meta','href','src','poster']);
const elements=[];
for(const filename of files) {
 const source=await fs.readFile(filename,'utf8');
 const tree=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const occurrences=new Map();
 function record(node,kind,value) {
  const clean=value.replace(/\s+/g,' ').trim();if(!clean)return;
  const fingerprint=`${filename}:${kind}:${clean}`;const occurrence=(occurrences.get(fingerprint)||0)+1;occurrences.set(fingerprint,occurrence);
  const id=createHash('sha256').update(`${fingerprint}:${occurrence}`).digest('hex').slice(0,20);
  const line=tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1;
  const old=saved.get(id);
  elements.push({id,file:filename,line,kind,sourceValue:clean,...(old?{cmsField:old.cmsField,source:old.source,owner:old.owner,permission:old.permission,validation:old.validation,migrationStatus:old.migrationStatus,exception:old.exception}:{cmsField:null,source:kind.endsWith('expression')?'dynamic-expression-to-trace':'code-literal',owner:'unassigned',permission:'unmapped',validation:[],migrationStatus:'pending',exception:null})});
 }
 function visit(node) {
  if(ts.isJsxText(node)) record(node,'text',node.text);
  if(ts.isJsxAttribute(node)&&attributes.has(node.name.getText(tree))&&node.initializer) {
   if(ts.isStringLiteral(node.initializer))record(node,`attribute:${node.name.getText(tree)}`,node.initializer.text);
   else if(ts.isJsxExpression(node.initializer)&&node.initializer.expression)record(node,`attribute:${node.name.getText(tree)}:expression`,node.initializer.expression.getText(tree));
  }
  if(ts.isJsxExpression(node)&&node.expression&&(ts.isStringLiteral(node.expression)||ts.isNoSubstitutionTemplateLiteral(node.expression)))record(node,'text-expression',node.expression.text);
  ts.forEachChild(node,visit);
 }
 visit(tree);
}
const routes=files.filter(f=>f.endsWith('/page.tsx')).map(file=>({route:file.slice(3,-9).replace(/\/$/,'')||'/',file,inspectionStatus:'pending',compositionFields:[],notes:'Inspect component imports, conditionals, data constants and responsive states before marking complete.'}));
const result={version:1,scope:'Static source inventory seed, not completed coverage certification',limitations:['Literal JSX text and selected attributes only. Dynamic content sources, CSS text, string constants, form messages, route metadata, conditional states and runtime-only labels still need manual tracing.','Route inventory lists templates, not every generated URL.','Each pending element requires an operational CMS field or an approved documented exception before completion.'],routes,elements,excluded:[{paths:excludedPrefixes,reason:'Existing admin/API/Studio implementation is being replaced or retained for migration; not public business content. New admin interface text is tracked separately.'}]};
await fs.writeFile(file,JSON.stringify(result,null,2)+'\n');
console.log(`Inventoried ${routes.length} public route templates and ${elements.length} candidate editable elements across ${files.length} source files. All new entries require mapping and verification.`);
