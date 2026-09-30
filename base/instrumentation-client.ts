// Browser Sentry setup. This app shows chart text, evidence, and patient
// details on screen, so nothing here may capture page content or user data:
// no session replay, no default PII, no console log forwarding.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,
  enableLogs: false,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
