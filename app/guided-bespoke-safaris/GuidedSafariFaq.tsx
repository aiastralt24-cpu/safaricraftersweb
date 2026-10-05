"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const questions = [
  {
    question: "Can I add a private guide to any Safari Crafters journey?",
    answer: "Yes. A Safari Crafters guide can accompany an existing private journey, subject to availability and the requirements of the destination. We confirm the pairing while shaping the itinerary."
  },
  {
    question: "What difference does a dedicated guide make?",
    answer: "A dedicated guide brings continuity to the whole journey. They read behaviour, interpret calls and movement, work with local naturalists and adjust the pace of each day around what is happening in the field."
  },
  {
    question: "Is a guided safari only for photographers?",
    answer: "No. Photographers benefit from advice on light, position and animal movement, while non-photographers gain a richer understanding of behaviour, habitat and the subtle signs that are easy to miss."
  },
  {
    question: "Can each day be tailored around our priorities?",
    answer: "Yes. Within local regulations and operating conditions, the guide helps shape field time around your interests, preferred pace and the encounters that matter most to you."
  }
];

export function GuidedSafariFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="guided-faq-list">
      {questions.map((item, index) => {
        const isOpen = openIndex === index;
        const answerId = `guided-faq-answer-${index}`;
        return (
          <article className={isOpen ? "is-open" : ""} key={item.question}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span>{item.question}</span>
                <Plus aria-hidden="true" size={22} strokeWidth={1.25} />
              </button>
            </h3>
            <div className="guided-faq-answer" id={answerId} hidden={!isOpen}>
              <p>{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
