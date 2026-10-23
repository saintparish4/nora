// Browser Sentry setup. This app shows chart text, evidence, and patient
// details on screen, so nothing here may capture page content or user data:
// no session replay, no data collection (lib/sentry-data-collection.ts),
// no console log forwarding.
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "@/lib/sentry-data-collection";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,
  dataCollection: SENTRY_DATA_COLLECTION,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
