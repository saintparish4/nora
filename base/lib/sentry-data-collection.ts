import type * as Sentry from '@sentry/nextjs';

/**
 * What Sentry may collect: nothing about people or their data. This app shows
 * and sends chart text, evidence and patient details, so an error report
 * carries the stack trace and nothing else.
 *
 * Sentry 11 replaced `sendDefaultPii` with this, and its defaults collect
 * user info, cookies, headers, request and response bodies, query strings,
 * database parameters, and the values of local variables. Every one is off
 * here, so upgrading did not quietly start sending chart text. Used by every
 * Sentry.init in the app.
 */
export const SENTRY_DATA_COLLECTION: NonNullable<Parameters<typeof Sentry.init>[0]>['dataCollection'] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
