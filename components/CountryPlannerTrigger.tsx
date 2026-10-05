"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import { PlannerForm } from "@/components/PlannerForm";
import "../app/forms.css";
import "./CountryPlannerTrigger.css";
export function CountryPlannerTrigger({ interest, region = "Africa", className = "kenya-text-link" }: { interest:string; region?:string; className?:string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened,setOpened] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <><button type="button" className={className} onClick={()=>{setOpened(true);dialog.current?.showModal();}}>Start planning<ArrowUpRight size={18}/></button>
    {mounted && createPortal(<dialog ref={dialog} className="country-planner-dialog" aria-label={`Plan ${interest}`} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
      <header className="country-planner-header">
        <div><p className="eyebrow">Your private journey</p><h2>{interest}</h2></div>
        <button type="button" className="country-planner-close" aria-label="Close planner" onClick={()=>dialog.current?.close()}><X/></button>
      </header>
      <div className="country-planner-body">
        {opened && <PlannerForm initialContext={{sourceLabel:interest,region,types:["Private"],notes:`I am interested in ${interest}.`}}/>}
      </div>
    </dialog>, document.body)}</>;
}
