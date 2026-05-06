import fs from "node:fs";

const contentPath = "content/site-content.json";
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));

const EDITORIAL_GROUPS = ["journeys", "destinations", "expeditions"];

const replacements = [
  [/\s+/g, " "],
  [/\.\./g, "."],
  [/Thissojourn/g, "This sojourn"],
  [/mother Earth/g, "Mother Earth"],
  [/vast, elemental/g, "vast and elemental"],
  [/far ridge\.Pack/g, "far ridge. Pack"],
  [/Nocturnal explorations/g, "Night drives and nocturnal explorations"],
  [/some of the best trackers from the region makes/g, "some of the best trackers from the region make"]
];

function clean(text = "") {
  let next = text.trim();
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  return next
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .trim();
}

function sentences(text) {
  return clean(text)
    .split(/(?<=[.!?])\s+(?=(?:[A-Z0-9“"']|This|From|In|Across|For|With|Guided|Designed|Explore|Travel|Every|Each|Here|There|Unlike|Sail|Join|Cold|High))/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function paragraphize(text, target = 360) {
  const parts = sentences(text);
  if (parts.length <= 1) return clean(text);

  const paragraphs = [];
  let current = "";

  for (const sentence of parts) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (current && candidate.length > target) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current) paragraphs.push(current);
  return paragraphs.join("\n\n");
}

function paragraphArray(items = [], target = 420) {
  const out = [];

  for (const item of items) {
    const paragraphs = paragraphize(item, target).split(/\n{2,}/);
    out.push(...paragraphs.map(clean).filter(Boolean));
  }

  return out;
}

function withoutIntroRepeats(body = [], intro = "") {
  const introParagraphs = new Set(
    intro
      .split(/\n{2,}/)
      .map((paragraph) => clean(paragraph).slice(0, 140))
      .filter(Boolean)
  );

  return body.filter((paragraph) => !introParagraphs.has(clean(paragraph).slice(0, 140)));
}

for (const group of EDITORIAL_GROUPS) {
  for (const item of content[group] ?? []) {
    if (item.intro) {
      item.intro = paragraphize(item.intro, group === "destinations" ? 360 : 380);
    }

    if (Array.isArray(item.body)) {
      item.body = paragraphArray(item.body, 430);
      item.body = withoutIntroRepeats(item.body, item.intro);
    }

    if (Array.isArray(item.days)) {
      for (const day of item.days) {
        if (day.copy) day.copy = clean(day.copy);
      }
    }
  }
}

fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`);
