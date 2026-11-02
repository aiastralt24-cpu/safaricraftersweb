/** Emphasize the first exact occurrence without accepting markup or rewriting copy. */
export function headingEmphasisMatches(value:{title?:string;titleAccent?:string}){
 return value.titleAccent===undefined||Boolean(value.titleAccent.trim()&&value.title?.includes(value.titleAccent));
}
export function headingParts(title:string,accent?:string){
 const index=accent?title.indexOf(accent):-1;
 return index<0||!accent?{before:title,emphasis:'',after:''}:{before:title.slice(0,index),emphasis:accent,after:title.slice(index+accent.length)};
}
