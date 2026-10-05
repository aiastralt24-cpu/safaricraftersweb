import Link from "next/link";
import { ArrowUpRight, Backpack, Camera, Compass, BookOpen, Sun } from "lucide-react";

const categories = [
  { title: "Caps & Hats", icon: Sun, items: "Safari caps · Bucket hats · Wide-brim hats", copy: "For early starts and long days beneath an open sky." },
  { title: "Safari Bags", icon: Backpack, items: "Duffels · Daypacks · Weekend bags", copy: "Room for the essentials. Ready for the journey." },
  { title: "Photography Bags", icon: Camera, items: "Camera backpacks · Lens cases · Padded inserts", copy: "A place for the equipment that holds your stories." },
  { title: "Safari Accessories", icon: Compass, items: "Binocular straps · Rain covers · Field notebooks", copy: "The small things that make a day in the field." },
];
export default function FieldCategories() {
  return <section className="field-categories" aria-labelledby="field-categories-title"><div className="container">
    <div className="field-categories-heading"><h2 id="field-categories-title">Made for the field.</h2><p>From the pages you keep to the pieces you carry. Explore what’s next for the Safari Crafters collection.</p></div>
    <div className="field-category-grid">{categories.map(({ title, icon: Icon, items, copy }, index) => <article className="field-category" key={title}>
      <div className="field-category-top"><span>0{index + 1}</span><span>Coming soon</span></div>
      <Icon size={44} strokeWidth={1} aria-hidden="true" />
      <h3>{title}</h3><p>{copy}</p><small>{items}</small>
    </article>)}</div>
    <Link href="/store/books" className="field-books"><BookOpen size={30} strokeWidth={1}/><div><span>Available now</span><h3>The book collection</h3></div><span className="field-books-cta">Explore books <ArrowUpRight size={20}/></span></Link>
  </div></section>;
}
