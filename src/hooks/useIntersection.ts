"use client";

import { useEffect, useState, useRef, RefCallback } from "react";

interface IntersectionOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

/**
 * Hook to observe element intersections with the viewport.
 * Useful for lazy loading components and scroll-reveal animations.
 * 
 * @param options IntersectionObserver configuration options
 */
export function useIntersection(options: IntersectionOptions = {}): [RefCallback<HTMLElement>, boolean] {
  const { threshold = 0, root = null, rootMargin = "0px", triggerOnce = false } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!element) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && triggerOnce) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [element, threshold, root, rootMargin, triggerOnce]);

  return [setElement, isIntersecting];
}

export default useIntersection;
