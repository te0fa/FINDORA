"use client";

import { analytics } from "@/lib/analytics/tracker";

/**
 * Custom hook to access the landing page analytics tracker system.
 */
export function useAnalytics() {
  return analytics;
}

export default useAnalytics;
