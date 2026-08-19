import * as Sentry from "@sentry/nextjs";
import { sanitizeEvent } from "./src/lib/utils/sentry-sanitize";

export const sentryServerConfig = {
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console when Sentry is initialized.
  debug: false,

  beforeSend(event: any) {
    return sanitizeEvent(event);
  },
};

Sentry.init(sentryServerConfig);
