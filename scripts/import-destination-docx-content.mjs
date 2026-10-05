import fs from "node:fs";
import path from "node:path";

const sourceDir = "/private/tmp/safari-destination-docs";
const contentPath = path.resolve("content/site-content.json");
const slugByFile = {
  Amboseli: "amboseli", Bandhavgarh: "bandhavgarh", Jawai: "jawai", Kabini: "kabini", Kanha: "kanha",
  Kaziranga: "kaziranga", Ladakh: "ladakh", Laikipia: "laikipia", "Masai Mara": "masai-mara",
  "Mount Kenya": "mount-kenya", Panna: "panna", Ranthambhore: "ranthambhore", Samburu: "samburu",
  Singalila: "singalila", Spiti: "spiti-valley", Svalbard: "svalbard", Tadoba: "tadoba"
};

const conciseOverrides = {
  kabini: { bestMonths: "Year-round" },
  laikipia: { idealStay: "4 nights / 5 days", gateway: "By road from Nairobi" },
  "masai-mara": { gateway: "By road or light aircraft from Nairobi" },
  panna: { idealStay: "3 to 5 nights" },
  ranthambhore: { bestMonths: "March to June · October to February" },
  svalbard: { gateway: "Fly to Longyearbyen via Oslo or Tromsø" }
};

const clean = (value = "") => value
  .replace(/[\u000b\u000c\u2028\u2029]/g, "\n")
  .replace(/\u2028/g, "\n")
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

function between(text, start, end) {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) return "";
  const from = startIndex + start.length;
  const endIndex = end ? text.indexOf(end, from) : -1;
  return clean(text.slice(from, endIndex < 0 ? text.length : endIndex));
}

function firstParagraph(value) {
  return clean(value).split(/\n\s*\n/)[0]?.replace(/\n+/g, " ").trim() || "";
}

function conciseLines(value) {
  const lines = clean(value).split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return "";
  const dateLike = /(?:January|February|March|April|May|June|July|August|September|October|November|December|year-round|all year)/i;
  const selected = [lines[0]];
  if (lines[1] && lines[1].length < 36 && dateLike.test(lines[1]) && !/[.!?]$/.test(lines[1])) selected.push(lines[1]);
  return selected.join(" · ");
}

function parseDoc(text) {
  const hero = between(text, "Hero header", "Section 1:");
  const section1 = between(text, "Section 1: Text", "Section 2:");
  const quick = between(text, "Section 2: Quick info panel", "Section 3:");
  const section3 = between(text, "Section 3: Text", "Section 4:");
  const section5Start = text.indexOf("Section 5:");
  const section5End = text.indexOf("Section 6:", section5Start);
  const section5 = section5Start >= 0 ? clean(text.slice(section5Start, section5End >= 0 ? section5End : text.length)) : "";
  const faqMatch = text.match(/Section \d+: FAQ([\s\S]*?)(?=\nSection \d+:|$)/i);
  const faqBody = clean((faqMatch?.[1] || "").replace(/^\s*Headline:\s*\n?\s*Question, meet answer\.\s*/i, ""));
  const faqLines = faqBody.split("\n").map((line) => line.trim()).filter(Boolean);
  const faqs = [];
  let currentQuestion = "";
  let currentAnswer = [];
  for (const line of faqLines) {
    if (/\?$/.test(line)) {
      if (currentQuestion && currentAnswer.length) faqs.push({ question: currentQuestion, answer: clean(currentAnswer.join(" ")) });
      currentQuestion = line;
      currentAnswer = [];
    } else if (currentQuestion) {
      currentAnswer.push(line);
    }
  }
  if (currentQuestion && currentAnswer.length) faqs.push({ question: currentQuestion, answer: clean(currentAnswer.join(" ")) });

  const highlightsText = between(quick, "Highlights", "Best Time to Visit");
  const highlights = highlightsText.split("\n").map(clean).filter(Boolean);
  const bestTime = firstParagraph(between(quick, "Best Time to Visit", "Ideal Duration"));
  const idealStay = firstParagraph(between(quick, "Ideal Duration", "Getting There"));
  const gateway = firstParagraph(between(quick, "Getting There", ""));

  return {
    sourceTitle: firstParagraph(between(hero, "Headline:", "Caption:")),
    description: firstParagraph(between(hero, "Caption:", "")),
    intro: between(section1, "Right description:", ""),
    bestFor: highlights,
    bestMonths: conciseLines(between(quick, "Best Time to Visit", "Ideal Duration")) || bestTime,
    idealStay: conciseLines(between(quick, "Ideal Duration", "Getting There")) || idealStay,
    gateway: conciseLines(between(quick, "Getting There", "")) || gateway,
    habitat: between(section3, "Right description:", ""),
    wildlife: between(section5, "Description:", ""),
    editorial: {
      openingHeadline: firstParagraph(between(section1, "Left hero headline:", "Right description:")),
      landscapeHeadline: firstParagraph(between(section3, "Left hero headline:", "Right description:")),
      wildlifeHeadline: firstParagraph(between(section5, "headline:", "Description:"))
    },
    faqs
  };
}

const site = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const destinations = site.destinations;
if (!Array.isArray(destinations)) throw new Error("content/site-content.json has no destinations array");

let updated = 0;
for (const [fileName, slug] of Object.entries(slugByFile)) {
  const textPath = path.join(sourceDir, `${fileName}.txt`);
  const destination = destinations.find((item) => item.slug === slug);
  if (!destination) throw new Error(`Destination not found: ${slug}`);
  if (!fs.existsSync(textPath)) throw new Error(`Extracted source not found: ${textPath}`);
  const parsed = parseDoc(fs.readFileSync(textPath, "utf8"));
  const comparableTitle = parsed.sourceTitle.toLowerCase().replace(/\s+valley$/, "").trim();
  const comparableDestination = destination.title.toLowerCase().replace(/\s+valley$/, "").trim();
  if (comparableTitle !== comparableDestination) {
    console.warn(`Skipped ${fileName}: document headline is "${parsed.sourceTitle}", expected "${destination.title}".`);
    continue;
  }
  if (slug === "mount-kenya" && /The Mara is peak safari|Meet the Mara/i.test(parsed.description + parsed.intro)) {
    console.warn("Skipped Mount Kenya: the attachment contains Masai Mara body content.");
    continue;
  }
  for (const field of ["description", "intro", "bestMonths", "idealStay", "gateway", "habitat", "wildlife"]) {
    if (parsed[field]) destination[field] = parsed[field];
  }
  if (parsed.bestFor.length) destination.bestFor = parsed.bestFor;
  if (parsed.faqs.length) destination.faqs = parsed.faqs;
  destination.editorial = parsed.editorial;
  Object.assign(destination, conciseOverrides[slug] || {});
  updated += 1;
}

fs.writeFileSync(contentPath, `${JSON.stringify(site, null, 2)}\n`);
console.log(`Updated ${updated} destination records from DOCX source text.`);
