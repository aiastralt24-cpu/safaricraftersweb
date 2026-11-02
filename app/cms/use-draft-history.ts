'use client';
import {useState} from 'react';
import {createDraftHistory,recordDraftChange,moveDraftHistory} from '../../lib/cms/draft-history';

/** Controlled draft history. An incoming replacement resets history so another
 * record/revision cannot be restored into the current editor. */
export function useDraftHistory<T>(value:T,onChange:(value:T)=>void,disabled:boolean,scopeKey:string=''){
 const [scope,setScope]=useState(scopeKey);
 const [history,setHistory]=useState(()=>createDraftHistory(value));
 const incoming=JSON.stringify(value);
 const current=scope===scopeKey&&incoming===history.present?history:createDraftHistory(value);
 if(scope!==scopeKey)setScope(scopeKey);
 if(current!==history)setHistory(current);
 function change(next:T){
  if(disabled)return;
  const updated=recordDraftChange(current,next);
  if(updated===current)return;
  setHistory(updated);onChange(next);
 }
 function move(direction:'undo'|'redo'){
  if(disabled)return;
  const updated=moveDraftHistory(current,direction);
  if(updated===current)return;
  setHistory(updated);onChange(JSON.parse(updated.present) as T);
 }
 return {change,undo:()=>move('undo'),redo:()=>move('redo'),canUndo:!disabled&&current.past.length>0,canRedo:!disabled&&current.future.length>0};
}
