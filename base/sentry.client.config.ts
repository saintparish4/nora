// Client-side Sentry (browser). Uses NEXT_PUBLIC_SENTRY_DSN.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Healthcare app: do not send PII by default.
  sendDefaultPii: false,
});
