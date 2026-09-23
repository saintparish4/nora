/**
 * Preview sections — dashboard areas that are designed but not built.
 *
 * `labs`, `billing`, `documents`, `medications`, and `messages` render realistic
 * clinical content (lab values, balances, a message thread) from hardcoded
 * arrays. There is no table, model, or endpoint behind any of it.
 *
 * Showing invented lab results or account balances to a real patient is a
 * credibility and liability problem, not just tech debt, so these routes are
 * hidden unless someone opts in explicitly:
 *
 *     NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS=true
 *
 * When off, each page calls notFound(). When on, PreviewBanner labels the page
 * as sample data so nobody mistakes it for their own record.
 *
 * Deleting this flag is the exit: either real endpoints land (and the pages stop
 * being previews) or the pages go.
 */
export const PREVIEW_SECTIONS_ENABLED =
  process.env.NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS === 'true';
