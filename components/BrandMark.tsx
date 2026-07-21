import Link from "next/link";
import "./BrandMark.css";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link className={`brand-mark ${className}`} href="/" aria-label="Safari Crafters home">
      <span className="brand-mark-image" aria-hidden="true" />
    </Link>
  );
}
