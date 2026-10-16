import { testimonials } from "@/lib/data";

const photographerNote = testimonials.find((item) => item.guestType === "Wildlife photographer");

export const guestStories = [
  {
    name: "Pallavi Khemka",
    category: "Private journey",
    trip: "Ranthambhore",
    quote: "Thank you Gaurav and team for an amazing trip to the Ranthambore. Gaurav made our trip so very convenient. Extremely friendly and responsive and at the same time professional at work.",
    image: "/assets/destinations/ranthambhore/ranthambhore-02.jpg",
    alt: "Bengal tiger in Ranthambhore",
    href: "/destinations/ranthambhore"
  },
  {
    name: "Hemil & Riddhi Shah",
    category: "Private journey",
    trip: "India",
    quote: "We started our journey with no expectations and every single recommendation from your end was worth it.",
    image: "/assets/destinations/jawai/jawai-03.jpg",
    alt: "Leopard country in Jawai",
    href: "/journeys"
  },
  {
    name: "Masumi Jhurmarvala",
    category: "Private journey",
    trip: "Kabini",
    quote: "Sachin at safari crafters helped us a lot be it encouraging us to go to Kabini, booking the safaris, constant support, and ensuring all is done in a timely manner in spite of his remote access.",
    image: "/assets/destinations/kabini/kabini-02.jpg",
    alt: "Elephant in the forests of Kabini",
    href: "/destinations/kabini"
  },
  {
    name: "Chintan Amin",
    category: "Guided wildlife safari",
    trip: "Tiger country",
    quote: "Really professional and very experienced Guide and driver. The only reason we could experience tiger so up close was only because of the dedication and skills of the team.",
    image: "/assets/destinations/kanha/kanha-03.jpg",
    alt: "Tiger habitat in Kanha",
    href: "/guided-bespoke-safaris"
  },
  {
    name: photographerNote?.name || "Guest name withheld",
    category: "Photography-led journey",
    trip: photographerNote?.trip || "Snow leopard country",
    quote: photographerNote?.quote || "The preparation was as valuable as the sighting. The team made the mountains feel possible.",
    image: "/assets/destinations/spiti-valley/spiti-valley-01.jpg",
    alt: "Snow leopard country in the high Himalaya",
    href: "/photo-expeditions",
    anonymous: true
  },
  {
    name: "Nirvaan Harichandrai",
    category: "Wilderness journey",
    trip: "India",
    quote: "I had one of the most magical experiences of my life. Safari Crafters made it happen.",
    image: "/assets/destinations/pantanal/supplied/01.webp",
    alt: "Jaguar beside a riverbank in the Pantanal",
    href: "/journeys"
  }
];
