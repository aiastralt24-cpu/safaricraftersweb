type EditorialProseProps = {
  text: string;
  className?: string;
};

export function splitEditorialParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function EditorialProse({ text, className = "editorial-prose" }: EditorialProseProps) {
  return (
    <div className={className}>
      {splitEditorialParagraphs(text).map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 32)}`}>{paragraph}</p>
      ))}
    </div>
  );
}
