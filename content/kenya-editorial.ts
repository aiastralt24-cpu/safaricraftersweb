import type { FAQItem } from "@/lib/data";

export const kenyaDescription = "Big cats on the Mara plains, elephants beneath Kilimanjaro and quiet encounters in Laikipia.";

export const kenyaPlaces = [
  { slug: "masai-mara", title: "Masai Mara", subtitle: "The Africa of your imagination", copy: "Big cats in open savannah, extraordinary light and the Great Migration. Masai Mara is Kenya at its most cinematic: a landscape that rewards time spent watching animal behaviour.", focus: "Big cats · Open plains · Wildlife photography" },
  { slug: "amboseli", title: "Amboseli", subtitle: "In the shadow of Kilimanjaro", copy: "Elephants move across grassy plains beneath Africa’s highest mountain. Amboseli brings enormous skies, intimate herd encounters and the space to watch the day unfold at an elephant’s pace.", focus: "Elephants · Mountain views · Open skies" },
  { slug: "laikipia", title: "Laikipia", subtitle: "A different side of Kenya", copy: "Rocky country, woodland and private conservancies open a quieter chapter. For patient photographers, Laikipia offers the possibility of remarkable leopard encounters, including the elusive black leopard, with guiding and access carefully arranged.", focus: "Leopards · Conservancies · Patient observation" }
];

export const kenyaCombinations = [
  { slug: "mara-amboseli", title: "Masai Mara & Amboseli", note: "First safari", image: { src: "/assets/destinations/amboseli/amboseli-01.jpg", alt: "Elephant beneath Mount Kilimanjaro in Amboseli" }, copy: "Big cats, elephant herds and Kilimanjaro views." },
  { slug: "mara-laikipia", title: "Masai Mara & Laikipia", note: "Photography", image: { src: "/assets/destinations/laikipia/supplied/03.webp", alt: "Black leopard crossing a woodland track in Laikipia" }, copy: "Open plains and patient leopard encounters." },
  { slug: "three-landscapes", title: "Masai Mara, Amboseli & Laikipia", note: "Extended journey", image: { src: "/assets/destinations/masai-mara/masai-mara-02.jpg", alt: "Lion on a green hillside beneath dramatic Masai Mara skies" }, copy: "Three landscapes, explored over 10–14 nights." }
];

export const kenyaFaqs: FAQItem[] = [
  { question: "How should I choose dates for my wildlife priorities?", answer: "Start with what you most want to photograph or observe. Migration movements vary, so a travel window cannot guarantee a particular sighting. We check routing and camp access for your dates and discuss the trade-offs before suggesting a journey." },
  { question: "What determines the pace of my itinerary?", answer: "Transfer time, flight connections and how much time you want in each place all affect the pace. If your dates are fixed, we can reduce the number of stops to leave more time for repeat drives and quieter time at camp." },
  { question: "Can I combine wildlife drives with other experiences?", answer: "Depending on the chosen conservancy and camp, a Laikipia stay may include guided walking and other activities alongside game drives. We confirm what is available, suitable and permitted before proposing your itinerary." },
  { question: "What should I share when I start planning?", answer: "Your preferred dates, number of travellers, approximate budget and wildlife or photography interests give us a useful starting point. Let us know any preferences for accommodation, private vehicles or pace, even if you have not chosen your destinations yet." }
];
