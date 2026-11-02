import ts from 'typescript';
import {z} from 'zod';
const line=z.object({lead:z.string().max(200),rest:z.string().max(200),accent:z.string().max(200)}).strict().refine(value=>Boolean((value.lead+value.rest+value.accent).trim()),'Hero text cannot be blank.');
const lines=z.array(line).min(1).max(10);
/** Inspect literals only; never execute the website source to extract copy. */
export function readDefaultHomepageHeroLines(source){
 const file=ts.createSourceFile('ConceptExperience.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(file.parseDiagnostics.length)throw Error('Homepage source has syntax errors.');
 const matches=[];
 for(const statement of file.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&declaration.name.text==='defaultHeroLines')matches.push(declaration.initializer);
 if(matches.length!==1||!matches[0]||!ts.isArrayLiteralExpression(matches[0]))throw Error('Expected one literal defaultHeroLines array.');
 return lines.parse(matches[0].elements.map(element=>{
  if(!ts.isObjectLiteralExpression(element))throw Error('Hero frames must be literal objects.');
  const result={};
  for(const property of element.properties){
   if(!ts.isPropertyAssignment(property)||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name))||!ts.isStringLiteral(property.initializer))throw Error('Hero text must use static string literals.');
   const key=property.name.text;if(Object.hasOwn(result,key))throw Error('Duplicate hero field.');result[key]=property.initializer.text;
  }
  return result;
 }));
}
export function resolveCapturedHomepageHeroLines(defaults,homepage){
 const fallback=lines.parse(defaults);
 if(homepage===undefined||homepage===null)return fallback;
 const value=z.object({title:z.string().min(1).max(200),heroLines:z.array(line).max(10).optional()}).passthrough().parse(homepage);
 return value.heroLines?.length?value.heroLines:[{lead:value.title,rest:'',accent:''}];
}
