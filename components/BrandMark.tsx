import Link from "next/link";
import "./BrandMark.css";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link className={`brand-mark ${className}`} href="/" aria-label="Safari Crafters home">
      <img src="/brand/safari-crafters-logo.svg" alt="" aria-hidden="true" />
    </Link>
  );
}
