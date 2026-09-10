import { ExpandableText } from "@/components/ExpandableText";

type EditorialProseProps = {
  text: string;
  className?: string;
  collapsible?: boolean;
  desktopLines?: number;
  mobileLines?: number;
};

export function splitEditorialParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function EditorialProse({
  text,
  className = "editorial-prose",
  collapsible = false,
  desktopLines = 7,
  mobileLines = 5
}: EditorialProseProps) {
  const paragraphs = splitEditorialParagraphs(text).map((paragraph, index) => (
    <p key={`${index}-${paragraph.slice(0, 32)}`}>{paragraph}</p>
  ));

  if (!collapsible) return <div className={className}>{paragraphs}</div>;

  return (
    <ExpandableText
      className="editorial-prose-expandable"
      contentClassName={className}
      desktopLines={desktopLines}
      mobileLines={mobileLines}
    >
      {paragraphs}
    </ExpandableText>
  );
}
