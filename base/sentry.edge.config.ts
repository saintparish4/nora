// Sentry for edge (middleware, edge routes). Uses NEXT_PUBLIC_SENTRY_DSN.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "@/lib/sentry-data-collection";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  dataCollection: SENTRY_DATA_COLLECTION,
});
