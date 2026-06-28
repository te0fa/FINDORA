import { Variants, Transition } from "framer-motion";

// ==========================================================================
// EASING CURVES & TRANSITION CONSTANTS
// ==========================================================================
export const EASING: Record<string, any> = {
  standard: [0.4, 0, 0.2, 1],
  in: [0.4, 0, 1, 1],
  out: [0, 0, 0.2, 1],
  premium: [0.16, 1, 0.3, 1], // Ultra smooth spring-like ease-out
  premiumInOut: [0.85, 0, 0.15, 1],
};

export const TRANSITION_FAST: Transition = {
  duration: 0.15,
  ease: EASING.standard,
};

export const TRANSITION_NORMAL: Transition = {
  duration: 0.25,
  ease: EASING.premium,
};

export const TRANSITION_SLOW: Transition = {
  duration: 0.45,
  ease: EASING.premium,
};

export const TRANSITION_PREMIUM: Transition = {
  duration: 0.6,
  ease: EASING.premium,
};

// ==========================================================================
// MOTION VARIANTS FOR REUSABLE UI
// ==========================================================================

// Page transition wrappers
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASING.premium,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: 0.35,
      ease: EASING.in,
    },
  },
};

// Dialogs and Modals backdrop fade
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: EASING.out }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: EASING.in }
  }
};

// Dialog scale-up modal content
export const modalVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: 0.4, 
      ease: EASING.premium 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: 8,
    transition: { 
      duration: 0.25, 
      ease: EASING.in 
    } 
  }
};

// Drawer slide-in
export const drawerVariants = (dir: "ltr" | "rtl" = "ltr"): Variants => ({
  hidden: { 
    x: dir === "rtl" ? "100%" : "-100%",
  },
  visible: { 
    x: 0,
    transition: { 
      duration: 0.45, 
      ease: EASING.premium 
    } 
  },
  exit: { 
    x: dir === "rtl" ? "100%" : "-100%",
    transition: { 
      duration: 0.35, 
      ease: EASING.in 
    } 
  }
});

// Card hover lifts and glows
export const cardHoverVariants: Variants = {
  initial: {
    y: 0,
    boxShadow: "var(--elevation-low)",
    borderColor: "var(--border)",
  },
  hover: {
    y: -6,
    boxShadow: "var(--elevation-premium)",
    borderColor: "rgba(200, 151, 59, 0.3)",
    transition: {
      duration: 0.3,
      ease: EASING.premium,
    }
  }
};

// Accordion (collapsible lists)
export const accordionVariants: Variants = {
  hidden: { 
    height: 0,
    opacity: 0,
    overflow: "hidden",
  },
  visible: { 
    height: "auto",
    opacity: 1,
    transition: { 
      height: { duration: 0.3, ease: EASING.premium },
      opacity: { duration: 0.2, delay: 0.05 }
    } 
  },
  exit: { 
    height: 0,
    opacity: 0,
    transition: { 
      height: { duration: 0.25, ease: EASING.in },
      opacity: { duration: 0.15 }
    } 
  }
};

// Tooltip fade-in
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 4 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.15, ease: EASING.premium } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: 4,
    transition: { duration: 0.12, ease: EASING.in } 
  }
};

// Dropdown slide & fade
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: -6, pointerEvents: "none" },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    pointerEvents: "auto",
    transition: { duration: 0.2, ease: EASING.premium } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.97, 
    y: -6,
    pointerEvents: "none",
    transition: { duration: 0.15, ease: EASING.in } 
  }
};

// Magnetic micro interactions on buttons
export const buttonPressVariants: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2, ease: EASING.premium }
  },
  pressed: { 
    scale: 0.97,
    transition: { duration: 0.1 }
  }
};

// Scroll Reveal animation
export const scrollRevealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASING.premium
    }
  }
};
