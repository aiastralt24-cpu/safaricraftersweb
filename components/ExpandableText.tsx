"use client";

import { ChevronDown } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import styles from "./ExpandableText.module.css";

type ExpandableTextProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  desktopLines?: number;
  mobileLines?: number;
};

type ExpandableStyle = CSSProperties & {
  "--expandable-content-height": string;
  "--expandable-desktop-lines": number;
  "--expandable-mobile-lines": number;
};

export function ExpandableText({
  children,
  className,
  contentClassName,
  desktopLines = 7,
  mobileLines = 5
}: ExpandableTextProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    const measure = () => {
      const contentStyle = window.getComputedStyle(content);
      const lineCount = window.matchMedia("(max-width: 700px)").matches ? mobileLines : desktopLines;
      const lineHeight = Number.parseFloat(contentStyle.lineHeight) || 27;
      const nextHeight = content.scrollHeight;

      setContentHeight(nextHeight);
      setCanExpand(nextHeight > lineHeight * lineCount + 2);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(content);

    return () => observer.disconnect();
  }, [children, desktopLines, mobileLines]);

  const style = {
    "--expandable-content-height": `${contentHeight}px`,
    "--expandable-desktop-lines": desktopLines,
    "--expandable-mobile-lines": mobileLines
  } as ExpandableStyle;

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")} ref={rootRef} style={style}>
      <div
        className={[
          styles.content,
          expanded ? styles.expanded : "",
          canExpand ? "" : styles.unclamped,
          contentClassName
        ].filter(Boolean).join(" ")}
        id={contentId}
        ref={contentRef}
      >
        {children}
      </div>
      {canExpand ? (
        <button
          className={styles.button}
          type="button"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown size={15} strokeWidth={1.6} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
