import type {FormDefinition} from './forms.ts';
/** Walk in schema order so hiding a parent removes descendants and their answers. */
export function visibleFormState(form:FormDefinition,answers:Record<string,unknown>){
 const visible:FormDefinition['fields']=[],values:Record<string,unknown>={};
 for(const field of form.fields){
  if(field.showWhen){const source=values[field.showWhen.fieldId];if(!(Array.isArray(source)?source.includes(field.showWhen.optionId):source===field.showWhen.optionId))continue;}
  visible.push(field);if(Object.hasOwn(answers,field.id))values[field.id]=answers[field.id];
 }
 return {fields:visible,answers:values};
}

/** Defaults are visible UI selections, never server-side substitutes for omitted
 * answers. Apply on first appearance only, so clearing a field stays cleared. */
export function initialFormAnswers(form:FormDefinition){
 return applyNewVisibleDefaults(form,{},new Set<string>()).answers;
}
function applyNewVisibleDefaults(form:FormDefinition,answers:Record<string,unknown>,previouslyVisible:Set<string>){
 const values:Record<string,unknown>={};
 for(const field of form.fields){
  if(field.showWhen){const source=values[field.showWhen.fieldId];if(!(Array.isArray(source)?source.includes(field.showWhen.optionId):source===field.showWhen.optionId))continue;}
  if(Object.hasOwn(answers,field.id))values[field.id]=answers[field.id];
  else if(!previouslyVisible.has(field.id)&&'defaultOptionId' in field&&field.defaultOptionId!==undefined&&'options' in field&&field.options.some(option=>option.id===field.defaultOptionId))values[field.id]=field.defaultOptionId;
 }
 return visibleFormState(form,values);
}
export function changeFormAnswer(form:FormDefinition,answers:Record<string,unknown>,id:string,value:unknown){
 const previous=visibleFormState(form,answers);
 // Remove hidden answers before defaults are considered for newly revealed fields.
 const next=visibleFormState(form,{...previous.answers,[id]:value});
 return applyNewVisibleDefaults(form,next.answers,new Set(previous.fields.map(field=>field.id))).answers;
}
