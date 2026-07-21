import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumbs container" aria-label="Breadcrumb">
      <ol>
        {items.map((item) => (
          <li key={item.label}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}
