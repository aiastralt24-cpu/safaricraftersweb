"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { PlannerForm } from "@/components/PlannerForm";
import "../app/forms.css";
export function CountryPlannerTrigger({ interest, region = "Africa", className = "kenya-text-link" }: { interest:string; region?:string; className?:string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened,setOpened] = useState(false);
  return <><button type="button" className={className} onClick={()=>{setOpened(true);dialog.current?.showModal();}}>Start planning<ArrowUpRight size={18}/></button>
    <dialog ref={dialog} className="country-planner-dialog" aria-label={`Plan ${interest}`} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
      <button type="button" className="country-planner-close" aria-label="Close planner" onClick={()=>dialog.current?.close()}><X/></button>
      <header><p className="eyebrow">Your private journey</p><h2>{interest}</h2></header>
      {opened && <PlannerForm initialContext={{sourceLabel:interest,region,types:["Private"],notes:`I am interested in ${interest}.`}}/>}
    </dialog></>;
}
