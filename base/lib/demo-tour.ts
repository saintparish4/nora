/**
 * The guided walkthrough of the demo practice: its steps, and where it keeps
 * its place. The place lives in sessionStorage because the walkthrough crosses
 * page loads and one change of account (medical assistant to clinician).
 *
 * The walkthrough only looks. It selects requirements and opens a document,
 * but never verifies, approves, or changes a request, so it plays the same
 * for every visitor of the shared practice.
 */
import type { DemoRole, PaStatus } from '@/types';

export interface TourStep {
  role: DemoRole;
  /** A fixed path, or the request currently in this status. */
  page: { path: string } | { status: PaStatus };
  /** CSS selector of the element to spotlight. */
  target: string;
  /** Selectors to click, in order, once the page is ready. */
  before?: string[];
  /** Selectors to click when leaving the step. */
  after?: string[];
  title: string;
  body: string;
  seconds: number;
}

export const TOUR_STEPS: TourStep[] = [
  {
    role: 'staff',
    page: { path: '/dashboard' },
    target: '[data-tour="counts"]',
    title: "You are Jordan, the practice's medical assistant",
    body: 'Four prior authorization requests are open, each at a different stage. The clinician has already decided what each patient needs. Your job is the paperwork.',
    seconds: 9,
  },
  {
    role: 'staff',
    page: { status: 'gathering' },
    target: '[data-tour="requirements"]',
    title: 'Nora read the chart against the plan',
    body: "Each line is one of the payer's criteria. Nora looked through this patient's notes for text that documents each one.",
    seconds: 9,
  },
  {
    role: 'staff',
    page: { status: 'gathering' },
    target: '[data-tour="evidence"]',
    title: 'Every excerpt is quoted, not written',
    body: "This is the chart's own sentence, with its source and date. Jordan verifies or rejects it. Nora never marks a requirement met by itself.",
    seconds: 10,
  },
  {
    role: 'staff',
    page: { status: 'gathering' },
    target: '[role="dialog"]',
    before: ['[data-tour="view-document"]'],
    after: ['[data-tour="dialog-close"]'],
    title: 'One click shows it in the note',
    body: 'The quote is highlighted where it sits in the document, so it can be checked in context before anyone relies on it.',
    seconds: 9,
  },
  {
    role: 'staff',
    page: { status: 'needs_clarification' },
    target: '[data-tour="requirement"]',
    before: ['[data-tour="requirements"] li:last-child button'],
    title: 'A prescription is not a documented trial',
    body: 'This plan asks for a second medication trial. The chart only shows a pharmacy fill with no outcome, so Nora offered nothing, and the requirement is marked missing.',
    seconds: 12,
  },
  {
    role: 'staff',
    page: { status: 'needs_clarification' },
    target: '[data-tour="tasks"]',
    title: 'The gap becomes a task',
    body: 'The ordering clinician is asked to document exactly what is missing. The task closes when the requirement is resolved.',
    seconds: 8,
  },
  {
    role: 'staff',
    page: { status: 'ready_for_review' },
    target: '[data-tour="approval"]',
    title: 'Ready, but not Jordan’s to approve',
    body: 'Every requirement here is met with verified evidence. Only a clinician can sign off, so the button is locked for the medical assistant.',
    seconds: 9,
  },
  {
    role: 'clinician',
    page: { path: '/dashboard' },
    target: '[data-tour="attention"]',
    title: 'Now you are Dr. Chen, the clinician',
    body: 'Same practice, different day: the request waiting on her approval, and the documentation tasks Nora opened for her.',
    seconds: 9,
  },
  {
    role: 'clinician',
    page: { status: 'ready_for_review' },
    target: '[data-tour="approval"]',
    title: 'Approval pins what she read',
    body: 'When she approves, Nora records exactly which evidence she saw. Any edit afterwards voids the approval and sends the request back to her.',
    seconds: 10,
  },
  {
    role: 'clinician',
    page: { status: 'approved_by_payer' },
    target: '[data-tour="timeline"]',
    title: 'From first read to payer decision',
    body: 'An approved request becomes a PDF packet. Staff submit it and record the outcome, and every step keeps who did it and when.',
    seconds: 10,
  },
];

const KEY = 'nora-demo-tour';

export interface TourPlace {
  step: number;
  playing: boolean;
}

export function readTour(): TourPlace | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const place = JSON.parse(raw) as TourPlace;
    return Number.isInteger(place.step) && place.step >= 0 && place.step <= TOUR_STEPS.length ? place : null;
  } catch {
    return null;
  }
}

export function writeTour(place: TourPlace | null): void {
  try {
    if (place) window.sessionStorage.setItem(KEY, JSON.stringify(place));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked. The walkthrough then simply does not survive a page load.
  }
}

export function startTour(): void {
  writeTour({ step: 0, playing: true });
}
