import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import "./ItineraryBento.css";
type Item = { title:string; label:string; copy:string; image:{src:string;alt:string;credit?:string}; href?:string; action?:ReactNode; cta?:string };
export function ItineraryBento({items}:{items:Item[]}) {
 return <div className={`itinerary-bento itinerary-bento-${items.length}`}>
  {items.map(item=>{const content=<><Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width:760px) 100vw, 60vw"/><div className="itinerary-shade"/><div className="itinerary-copy"><span className="itinerary-label">{item.label}</span><h3>{item.title}</h3>{item.action || <span className="itinerary-cta">{item.cta || "Start planning"}<ArrowUpRight size={20} aria-hidden="true"/></span>}</div></>;return item.href ? <Link className="itinerary-card" href={item.href} key={item.title} aria-label={`${item.cta || "Start planning"} ${item.title}`}>{content}</Link> : <article className="itinerary-card" key={item.title}>{content}</article>;})}
 </div>;
}
