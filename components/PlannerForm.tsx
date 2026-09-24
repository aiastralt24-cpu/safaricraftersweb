"use client";

import { trackFunnel } from "@/lib/funnel-client";
import { EnquiryHoneypot } from "@/components/EnquiryHoneypot";
import { enquiryHeaders } from "@/lib/enquiry-client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import "./PlannerForm.css";

const regions = [
  { name: "India", copy: "Tiger forests, leopard country and the Himalaya" },
  { name: "Africa", copy: "Savannah, wetlands, primates and private conservancies" },
  { name: "The Americas", copy: "Rainforest, jaguar country and northern wilderness" },
  { name: "Arctic & Beyond", copy: "Svalbard’s sea ice and Russia’s Kamchatka wilderness" },
  { name: "Surprise me", copy: "Let our specialists recommend the right geography" }
];
const journeyTypes = ["Private", "Family", "Conservation", "Ultra-Luxury", "Small Group", "Photo-led"];
const experiencesByRegion: Record<string, string[]> = {
  India: ["Tigers", "Leopards", "Birdlife", "Photography hides", "Walking safaris", "Cultural immersion", "Conservation work", "Family-friendly camps"],
  Africa: ["Big Cats of Africa", "Great apes", "Birdlife", "Photography hides", "Walking safaris", "Cultural immersion", "Conservation work", "Family-friendly camps"],
  "The Americas": ["Jaguars", "Birdlife", "Photography hides", "Rainforest journeys", "Cultural immersion", "Conservation work", "Family-friendly camps"],
  "Arctic & Beyond": ["Polar wildlife", "Brown bears", "Wildlife photography", "Birdlife", "Photography hides", "Expedition cruising", "Cultural immersion", "Conservation work"],
  "Surprise me": ["Tigers", "Leopards", "Big Cats of Africa", "Jaguars", "Great apes", "Polar wildlife", "Birdlife", "Photography hides", "Walking safaris", "Expedition cruising", "Rainforest journeys", "Cultural immersion", "Conservation work", "Family-friendly camps"]
};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const occasions = ["Not decided yet", "A private escape", "Family time", "Photography", "A celebration", "Conservation interest"];
const accommodationStyles = ["Not decided yet", "Quiet luxury", "Classic safari camps", "Design-led lodges", "A considered mix"];
const investmentRanges = ["Prefer to discuss", "US$8k-15k", "US$15k-30k", "US$30k+ per person"];
const today = new Date();
const currentYear = today.getFullYear();
const currentMonthIndex = today.getMonth();


type PlannerInitialContext = {
  sourceLabel?: string;
  region?: string;
  types?: string[];
  experiences?: string[];
  notes?: string;
  specialist?: string;
};

export function PlannerForm({ initialContext }: { initialContext?: PlannerInitialContext }) {
  const initialRegion = initialContext?.region && experiencesByRegion[initialContext.region] ? initialContext.region : "";
  const initialExperiences = (initialContext?.experiences || []).filter((experience) =>
    initialRegion ? experiencesByRegion[initialRegion]?.includes(experience) : false
  );
  const [step, setStep] = useState(0);
  const [choosingRegion, setChoosingRegion] = useState(!initialRegion);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const phase = `${step}-${choosingRegion}`;
  const previousStep = useRef(phase);
  useEffect(() => {
    if (previousStep.current !== phase) {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start" });
      previousStep.current = phase;
    }
  }, [phase]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [enquiryResult, setEnquiryResult] = useState<{ enquiryId: string; specialist: string } | null>(null);
  const [form, setForm] = useState({
    region: initialRegion,
    types: initialContext?.types || ["Private"],
    experiences: initialExperiences,
    months: ["Flexible"],
    year: "Flexible",
    nights: "To discuss",
    travellers: "To discuss",
    name: "",
    email: "",
    phone: "",
    city: "",
    notes: initialContext?.notes || "",
    specialist: initialContext?.specialist || "Auto-route"
    ,occasion: "Not decided yet"
    ,flexibility: "To discuss"
    ,accommodation: "Not decided yet"
    ,investment: "Prefer to discuss"
    ,contactPreference: "Email"
    ,consent: false
  });

  const draftReady = useRef(false);
  const draftKey = "safari-planner-draft:" + (initialContext?.sourceLabel || "direct");
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      if (saved?.version === 1 && Date.now()-saved.savedAt < 86400000 && saved.form && typeof saved.form === "object") {
        setForm(current => {
          const restored = {...current};
          for (const key of ["region","year","nights","travellers","occasion","flexibility","accommodation","investment","contactPreference"] as const) {
            if (typeof saved.form[key] === "string" && saved.form[key].length < 160) restored[key] = saved.form[key];
          }
          for (const key of ["types","experiences","months"] as const) {
            if (Array.isArray(saved.form[key]) && saved.form[key].length <= 20 && saved.form[key].every((v:unknown)=>typeof v === "string" && v.length < 160)) restored[key] = saved.form[key];
          }
          return restored;
        });
        if (experiencesByRegion[saved.form.region]) {setChoosingRegion(false);if ([0,1,2].includes(saved.step)) setStep(saved.step); }
      }
    } catch {}
    draftReady.current=true;
  }, [draftKey]);
  useEffect(() => {
    if (!draftReady.current) return;
    try {
      if (submitted) {sessionStorage.removeItem(draftKey);return;}
      const {name,email,phone,city,notes,consent,specialist,...preferences}=form;
      sessionStorage.setItem(draftKey,JSON.stringify({version:1,savedAt:Date.now(),form:preferences,step}));
    } catch {}
  }, [form,submitted,draftKey,step]);

  const steps = useMemo(
    () => [
      "Your safari",
      "Your timing",
      "Your details"
    ],
    []
  );

  function toggle(key: "types" | "experiences" | "months", value: string) {
    setForm((current) => {
      const set = new Set(current[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...current, [key]: Array.from(set) };
    });
  }

  function selectRegion(region: string) {
    trackFunnel("planner_started");
    const availableExperiences = experiencesByRegion[region] || [];
    setForm((current) => ({
      ...current,
      region,
      experiences: current.experiences.filter((experience) => availableExperiences.includes(experience))
    }));
    setChoosingRegion(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    trackFunnel("enquiry_started");
    if (step < steps.length - 1) {
      if (requiredStepValidity[step]) setStep(step + 1);
      return;
    }

    const firstInvalidStep = requiredStepValidity.findIndex((valid) => !valid);
    if (firstInvalidStep !== -1) {
      setStep(firstInvalidStep);
      setSubmitError("Please complete this step before sending your private brief.");
      if (firstInvalidStep === 2) {
        setFieldErrors({
          ...(!form.name.trim() ? { name: "Please enter your name." } : {}),
          ...(!/\S+@\S+\.\S+/.test(form.email) ? { email: "Please enter a valid email address." } : {})
        });
      }
      return;
    }

    if (!form.consent) {
      setFieldErrors({ consent: "Please confirm your consent before sending the brief." });
      setSubmitError("");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setFieldErrors({});
    try {
      const payload = { website: String(new FormData(event.currentTarget).get("website") || ""), source: "planner", sourceLabel: initialContext?.sourceLabel, ...form };
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: await enquiryHeaders(payload),
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        trackFunnel("enquiry_failed");
        if (result.fields) setFieldErrors(result.fields);
        throw new Error(result.error || "We could not send your brief. Please try again.");
      }
      setEnquiryResult({ enquiryId: result.enquiryId, specialist: result.specialist });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your brief. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const requiredStepValidity = [
    Boolean(form.region) && form.experiences.length > 0,
    form.months.length > 0 && Boolean(form.year),
    Boolean(form.name.trim()) && /\S+@\S+\.\S+/.test(form.email)
  ];
  const allRequiredStepsValid = requiredStepValidity.every(Boolean);
  const stepValid = step === steps.length - 1
    ? allRequiredStepsValid && form.consent
    : requiredStepValidity[step];

  function canNavigateToStep(index: number) {
    if (index <= step) return true;
    return requiredStepValidity.slice(0, index).every(Boolean);
  }

  if (submitted) {
    return (
      <section className="planner-success" aria-live="polite">
        <Check size={36} />
        <h2 className="h2">Your brief has been received.</h2>
        <p>{enquiryResult?.specialist || "A Safari Crafters specialist"} will respond with considered next steps.</p>
        {enquiryResult?.enquiryId ? <p className="enquiry-reference">Private brief reference: {enquiryResult.enquiryId}</p> : null}
      </section>
    );
  }

  return (
    <form className="planner planner-streamlined" onSubmit={submit}><EnquiryHoneypot />
      <div className="planner-shell">
        <aside className="planner-note" aria-label="Planner progress">
          <div><p className="eyebrow">Plan your safari</p><h2 className="serif">A few details.<br/>A journey for you.</h2></div>
          <nav className="planner-stage-nav" aria-label="Planning stages">{steps.map((item,index)=><button type="button" key={item} disabled={!canNavigateToStep(index)} aria-current={index===step ? "step" : undefined} onClick={()=>setStep(index)}><span>{index+1}</span>{item}</button>)}</nav>
        </aside>
        <div className="planner-card">
          <p className="planner-count">{step+1} / {steps.length}</p>
          {initialContext?.sourceLabel && <p className="prefill-note">{initialContext.sourceLabel}</p>}
          <h2 className="h2" ref={headingRef} tabIndex={-1}>{step === 0 ? choosingRegion ? "Where would you like to go?" : "What interests you?" : steps[step]}</h2>
          <div className="planner-step-content" key={phase}>
          {step === 0 && (choosingRegion ? <>
            <p>Select a region to see its experiences.</p>
            <div className="choice-grid region-choice-grid">{regions.map(region=><button type="button" key={region.name} className={form.region===region.name ? "choice selected" : "choice"} aria-pressed={form.region===region.name} onClick={()=>selectRegion(region.name)}><span>{region.name}</span></button>)}</div>
          </> : <>
            <button type="button" className="planner-edit-region" onClick={()=>setChoosingRegion(true)}>{form.region} · Change region</button>
            <p>Choose as many as you like.</p>
            <ChipGroup values={experiencesByRegion[form.region] || []} selected={form.experiences} onToggle={value=>{setForm(current=>({...current,experiences:current.experiences.filter(item=>item!=="Open to suggestions")}));toggle("experiences",value);}}/>
            <button type="button" className="planner-unsure" onClick={()=>{setForm(current=>({...current,experiences:["Open to suggestions"]}));setStep(1);}}>Not sure yet — help me choose</button>
          </>)}
          {step === 1 && <>
            <p>Approximate plans are fine. We can work out the details together.</p>
            <div className="field-grid planner-compact-fields">
              <label>Year<select value={form.year} onChange={event=>setForm(current=>({...current,year:event.target.value,months:event.target.value===String(currentYear)?current.months.filter(month=>months.indexOf(month)>=currentMonthIndex):current.months}))}>{[String(currentYear),String(currentYear+1),String(currentYear+2),"Flexible"].map(year=><option key={year}>{year}</option>)}</select></label>
              <label>Travellers<select value={form.travellers} onChange={event=>setForm(current=>({...current,travellers:event.target.value}))}>{["1","2","3","4","5","6","7","8","9","10","11","12","To discuss"].map(value=><option key={value} value={value}>{value === "To discuss" ? "Not sure yet" : value}</option>)}</select></label>
              <label>Duration<select value={form.nights} onChange={event=>setForm(current=>({...current,nights:event.target.value}))}>{["3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","To discuss"].map(value=><option key={value} value={value}>{value === "To discuss" ? "Not sure yet" : value+" nights"}</option>)}</select></label>
            </div>
            <p>Preferred months · choose one or more</p>
            <ChipGroup values={months} selected={form.months} disabledValues={form.year===String(currentYear)?months.slice(0,currentMonthIndex):[]} onToggle={value=>{setForm(current=>({...current,months:current.months.filter(item=>item!=="Flexible")}));toggle("months",value);}}/>
            <button type="button" className="planner-unsure" onClick={()=>{setForm(current=>({...current,months:["Flexible"],year:"Flexible",flexibility:"Flexible by a few weeks"}));setStep(2);}}>Dates not decided — continue</button>
          </>}
          {step === 2 && <>
            <div className="field-grid">
              <label>Name<input required name="name" autoComplete="name" value={form.name} aria-invalid={Boolean(fieldErrors.name)} onChange={event=>setForm(current=>({...current,name:event.target.value}))}/>{fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}</label>
              <label>Email<input required name="email" type="email" autoComplete="email" value={form.email} aria-invalid={Boolean(fieldErrors.email)} onChange={event=>setForm(current=>({...current,email:event.target.value}))}/>{fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}</label>
              <label>WhatsApp / phone (optional)<input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={event=>setForm(current=>({...current,phone:event.target.value}))}/></label>
            </div>
            <details className="planner-optional"><summary>Optional preferences</summary>
              <p>Share anything else that will help us plan.</p>
              <p>Journey style</p><ChipGroup values={journeyTypes} selected={form.types} onToggle={value=>{if(form.types.length===1 && form.types.includes(value)) return;toggle("types",value);}}/>
              <div className="field-grid">
                <label>Accommodation character<select value={form.accommodation} onChange={event=>setForm(current=>({...current,accommodation:event.target.value}))}>{accommodationStyles.map(value=><option key={value}>{value}</option>)}</select></label>
                <label>Budget per person<select value={form.investment} onChange={event=>setForm(current=>({...current,investment:event.target.value}))}>{investmentRanges.map(value=><option key={value}>{value}</option>)}</select></label>
                <label>Occasion<select value={form.occasion} onChange={event=>setForm(current=>({...current,occasion:event.target.value}))}>{occasions.map(value=><option key={value}>{value}</option>)}</select></label>
                <label>Preferred contact<select value={form.contactPreference} onChange={event=>setForm(current=>({...current,contactPreference:event.target.value}))}>{["Email","Phone","WhatsApp"].map(value=><option key={value}>{value}</option>)}</select></label>
              </div>
              <label className="quiet-notes">Anything else?<textarea value={form.notes} onChange={event=>setForm(current=>({...current,notes:event.target.value}))}/></label>
            </details>
            <div className="planner-summary"><strong>Your safari at a glance</strong><p>{form.region} · {form.experiences.join(", ")}</p><p>{form.months[0]==="Flexible" ? "Dates to discuss" : form.months.join(", ")+" · "+form.year} · {form.nights==="To discuss" ? "Duration to discuss" : form.nights+" nights"} · {form.travellers==="To discuss" ? "Group size to discuss" : form.travellers+" travellers"}</p><button type="button" onClick={()=>setStep(0)}>Edit safari</button><button type="button" onClick={()=>setStep(1)}>Edit timing</button></div>
            <label className="consent-field"><input type="checkbox" checked={form.consent} onChange={event=>setForm(current=>({...current,consent:event.target.checked}))}/><span>I consent to Safari Crafters using these details to respond to my travel enquiry.</span></label>
            {fieldErrors.consent && <p className="field-error">{fieldErrors.consent}</p>}
          </>}
          </div>
          {submitError && <p className="planner-error" role="alert">{submitError}</p>}
          <div className="planner-actions">
            <button className="button" type="button" disabled={step===0 && choosingRegion} onClick={()=>step===0?setChoosingRegion(true):setStep(value=>value-1)}>Back</button>
            {step===0 && choosingRegion ? null : step<2 ? <button className="button button-solid" type="button" disabled={!stepValid} onClick={()=>setStep(value=>value+1)}>Next</button> : <button className="button button-solid" type="submit" disabled={!stepValid || submitting}>{submitting ? "Sending…" : "Help plan my safari"}</button>}
          </div>
        </div>
      </div>
    </form>
  );
}

function ChipGroup({
  values,
  selected,
  disabledValues = [],
  onToggle
}: {
  values: string[];
  selected: string[];
  disabledValues?: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="chip-grid">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          className={selected.includes(value) ? "chip selected" : "chip"}
          aria-pressed={selected.includes(value)}
          disabled={disabledValues.includes(value)}
          onClick={() => onToggle(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
