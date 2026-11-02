import {productSpecificationValue} from './product-attributes.ts';
/** Decode only explicit typed cells. Category compatibility is checked separately against saved definitions. */
export function productImportSpecificationValue(row:Record<string,string>){
 const {state,valueType='',value='',reason=''}=row;
 if(state!=='known'){
  if(valueType||value)throw new Error('Only known specifications may contain a value or value type.');
  if(state!=='notApplicable'&&reason)throw new Error('Only notApplicable specifications may contain a reason.');
  return productSpecificationValue.parse(state==='notApplicable'?{state,reason}:{state});
 }
 if(reason)throw new Error('Known specifications cannot contain a not-applicable reason.');
 let decoded:string|number|boolean;
 if(valueType==='text'||valueType==='choice')decoded=value;
 else if(valueType==='boolean'){
  if(value!=='true'&&value!=='false')throw new Error('Use exactly true or false for boolean values.');
  decoded=value==='true';
 }else if(valueType==='number'){
  if(!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(value))throw new Error('Use an explicit decimal number without whitespace, grouping or leading zeros.');
  decoded=Number(value);
  if(!Number.isFinite(decoded)||Math.abs(decoded)>Number.MAX_SAFE_INTEGER||decoded===0&&/[1-9]/.test(value.split(/[eE]/)[0]))throw new Error('The numeric value exceeds the supported precision or range.');
 }else throw new Error('Known specifications require text, choice, number or boolean value type.');
 return productSpecificationValue.parse({state,value:decoded});
}
