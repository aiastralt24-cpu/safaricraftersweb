import Link from "next/link";
import "./Breadcrumbs.css";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items, variant = "default" }: { items: BreadcrumbItem[]; variant?: "default" | "hero" }) {
  return (
    <nav className={`breadcrumbs${variant === "hero" ? " breadcrumbs-hero" : " container"}`} aria-label="Breadcrumb">
      <ol>
        {items.map((item) => (
          <li key={item.label}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}
