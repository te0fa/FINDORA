"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./FAQ.module.css";
import { accordionVariants } from "@/lib/design-system/motion";
import { useAnalytics } from "@/hooks/useAnalytics";

interface FAQProps {
  dict: any;
  locale: string;
  isRTL: boolean;
}

/**
 * Enterprise Component Contract: FAQ Accordion
 * Purpose: Answer customer objections transparently.
 * Props Interface: FAQProps
 * States: expandedIndex (number | null)
 * Accessibility: WCAG 2.2 AA compliant, ARIA expanded state, keyboard tabIndex selection
 * Analytics: FAQ expanded events, full read duration stubs
 * Reusability: Reusable on Support/Help Center directories and Vendor portal FAQs
 */
export default function FAQ({ dict, locale, isRTL }: FAQProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const track = useAnalytics();

  const landingDict = dict.landing_v3 || {};
  const faqDict = landingDict.faq || {};

  const faqItems = [
    { q: faqDict.q1, a: faqDict.a1 },
    { q: faqDict.q2, a: faqDict.a2 },
    { q: faqDict.q3, a: faqDict.a3 },
    { q: faqDict.q4, a: faqDict.a4 },
    { q: faqDict.q5, a: faqDict.a5 },
    { q: faqDict.q6, a: faqDict.a6 },
    { q: faqDict.q7, a: faqDict.a7 },
    { q: faqDict.q8, a: faqDict.a8 },
  ];

  const handleToggle = (index: number) => {
    const isOpening = expandedIndex !== index;
    setExpandedIndex(isOpening ? index : null);
    
    if (isOpening) {
      track.faqOpen(index, faqItems[index].q || "");
      
      // Simulating "FAQ read fully" trigger after 5 seconds
      setTimeout(() => {
        setExpandedIndex((currentIdx) => {
          if (currentIdx === index) {
            track.faqFullyRead(index, faqItems[index].q || "");
          }
          return currentIdx;
        });
      }, 5000);
    }
  };

  return (
    <section 
      id="faq" 
      className={styles.section}
      aria-labelledby="faq-title"
    >
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 id="faq-title" className={styles.title}>
            {faqDict.title || "Frequently Asked Objections"}
          </h2>
          <p className={styles.subtitle}>
            {faqDict.subtitle || "We address buying and sourcing uncertainties transparently."}
          </p>
        </div>

        <div className={styles.accordion} role="presentation">
          {faqItems.map((item, index) => {
            const isOpen = expandedIndex === index;
            const headerId = `faq-header-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div 
                key={index} 
                className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`}
              >
                <button
                  type="button"
                  id={headerId}
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  className={styles.faqHeader}
                  onClick={() => handleToggle(index)}
                >
                  <h3 className={styles.faqQuestion}>{item.q}</h3>
                  <span 
                    className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ""}`}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={headerId}
                      variants={accordionVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <div className={styles.faqBody}>
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export { FAQ };
