'use client';

import React, { useState } from 'react';

const faqs = [
  {
    question: 'How does Nora match me with specialists?',
    answer: 'Nora uses advanced AI to analyze your symptoms and health concerns, then matches you with specialists who have the most relevant expertise, accept your insurance, and have availability that fits your schedule.'
  },
  {
    question: 'Is my health information secure?',
    answer: 'Absolutely. Nora is fully HIPAA-compliant and uses enterprise-grade encryption. We never share your information without explicit consent.'
  },
  {
    question: 'How quickly can I get an appointment?',
    answer: 'Most users find and book an appointment in under 2 minutes. We show real-time availability, so you can often secure same-day or next-day appointments.'
  },
  {
    question: 'What insurance plans do you accept?',
    answer: 'Nora works with providers who accept most major insurance plans. We automatically filter specialists based on your coverage.'
  },
  {
    question: 'Can I cancel or reschedule?',
    answer: 'Yes, you can easily cancel or reschedule through the platform. We recommend giving at least 24 hours notice when possible.'
  },
  {
    question: 'Is there a cost to use Nora?',
    answer: 'Nora is free for patients. You only pay for your actual medical appointments, covered by your insurance as usual.'
  }
];

function FAQItem({ question, answer, isOpen, onClick }: { 
  question: string; 
  answer: string; 
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-start justify-between gap-4 text-left"
      >
        <span className="font-medium text-gray-900 text-sm">{question}</span>
        <svg 
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-5">
          <p className="text-sm text-gray-600 leading-relaxed pr-8">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const leftFaqs = faqs.slice(0, 3);
  const rightFaqs = faqs.slice(3);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-light text-gray-900">
            Have <span className="font-medium">questions?</span>
          </h2>
        </div>

        {/* Two-column FAQ */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            {leftFaqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>

          {/* Right column */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            {rightFaqs.map((faq, index) => {
              const actualIndex = index + 3;
              return (
                <FAQItem
                  key={actualIndex}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === actualIndex}
                  onClick={() => setOpenIndex(openIndex === actualIndex ? null : actualIndex)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
