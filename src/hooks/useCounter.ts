"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Custom hook to count up to a target number.
 * Ensures smooth animations and supports localized numerals rendering at UI level.
 * 
 * @param targetValue The final number to reach
 * @param duration Duration of the count-up in milliseconds (default: 1500ms)
 * @param triggerStart Whether to start counting immediately (default: true)
 */
export function useCounter(
  targetValue: number,
  duration = 1500,
  triggerStart = true
) {
  const [count, setCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (!triggerStart || targetValue <= 0) {
      setCount(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestampRef.current) {
        startTimestampRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimestampRef.current) / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentCount = Math.floor(easeProgress * targetValue);

      setCount(currentCount);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setCount(targetValue);
      }
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startTimestampRef.current = null;
    };
  }, [targetValue, duration, triggerStart]);

  return count;
}

export default useCounter;
