// Findora Motion Design Tokens (Enterprise Performance Standards)
// GPU-accelerated presets ensuring zero Jank (CLS < 0.1, INP < 200ms)

export const motionTokens = {
  duration: {
    fast: 0.15,
    normal: 0.25,
    slow: 0.45,
    slowest: 0.7,
  },
  easing: {
    standard: [0.4, 0, 0.2, 1], // easeInOut
    in: [0.4, 0, 1, 1],         // easeIn
    out: [0, 0, 0.2, 1],        // easeOut
    premium: [0.16, 1, 0.3, 1], // Ultra smooth spring-like easeOut
  },
  spring: {
    default: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
    soft: {
      type: "spring",
      stiffness: 60,
      damping: 20,
    },
    snappy: {
      type: "spring",
      stiffness: 180,
      damping: 12,
    },
  },
} as const;

export default motionTokens;
