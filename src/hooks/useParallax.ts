"use client";

import { useState, useEffect, RefObject } from "react";

interface MouseOffset {
  x: number;
  y: number;
}

/**
 * Custom hook to calculate mouse offsets relative to an element ref.
 * Enables card-parallax and interactive 3D tilt translations.
 * 
 * @param ref Ref object pointing to target HTML container
 * @param strength Strength scale modifier (default: 15)
 */
export function useParallax(ref: RefObject<HTMLElement | null>, strength = 15) {
  const [offsets, setOffsets] = useState<MouseOffset>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const element = ref.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const elementCenterX = rect.left + rect.width / 2;
      const elementCenterY = rect.top + rect.height / 2;

      // Calculate distance between mouse cursor and element center
      const distanceX = event.clientX - elementCenterX;
      const distanceY = event.clientY - elementCenterY;

      // Normalize values between -1 and 1 based on viewport/container sizes
      const percentX = distanceX / (window.innerWidth / 2);
      const percentY = distanceY / (window.innerHeight / 2);

      // Apply strength factor
      setOffsets({
        x: percentX * strength,
        y: percentY * strength,
      });
    };

    const handleMouseLeave = () => {
      // Smoothly return to center
      setOffsets({ x: 0, y: 0 });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    
    const element = ref.current;
    if (element) {
      element.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (element) {
        element.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [ref, strength]);

  return offsets;
}

export default useParallax;
