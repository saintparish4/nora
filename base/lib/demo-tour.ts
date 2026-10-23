/**
 * The guided walkthrough of the demo practice: its steps, and where it keeps
 * its place. It plays on one page, the request /demo opens on (the one
 * waiting for clarification), as the medical assistant, so the spotlight
 * glides from panel to panel instead of the visitor being moved between
 * pages. The place lives in sessionStorage so a reload resumes it.
 *
 * The walkthrough only looks. It selects requirements and opens a document,
 * but never verifies, approves, or changes a request, so it plays the same
 * for every visitor of the shared practice. Steps select requirements by
 * position in Cigna's criteria for Wegovy (db/seeds/policy_library.rb), as
 * the featured request is seeded (db/seeds/demo_requests.rb).
 */
import type { DemoRole, PaStatus } from '@/types';

/** The account and the request the walkthrough plays on. */
export const TOUR_ROLE: DemoRole = 'staff';
export const TOUR_REQUEST_STATUS: PaStatus = 'needs_clarification';

export interface TourStep {
  /** CSS selector of the element to spotlight. */
  target: string;
  /** Selectors to click, in order, once the page is ready. */
  before?: string[];
  /** Selectors to click when leaving the step. */
  after?: string[];
  title: string;
  body: string;
}

/**
 * How long a step stays up while playing: long enough to read the caption at
 * a skim (about seven words a second, plus a moment to find the spotlight),
 * and never long enough to wait on. A visitor who wants longer pauses.
 */
export function stepSeconds(step: Pick<TourStep, 'title' | 'body'>): number {
  const words = `${step.title} ${step.body}`.split(/\s+/).filter(Boolean).length;
  return Math.min(6, Math.max(3.5, 1 + words / 7.5));
}

const requirement = (position: number) => `[data-tour="requirements"] li:nth-child(${position}) button`;

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="requirements"]',
    title: "Nora read the chart against the payer's criteria",
    body: "Jane Rivera's request for Wegovy, checked against Cigna's published policy. Each line is one criterion and what a person decided about it.",
  },
  {
    target: '[data-tour="evidence"]',
    before: [requirement(2)],
    title: 'Every excerpt is quoted, not written',
    body: "This is the chart's own sentence, with its source and date. Jordan, the medical assistant, verified it. Nora never marks a requirement met by itself.",
  },
  {
    target: '[role="dialog"]',
    before: ['[data-tour="view-document"]'],
    after: ['[data-tour="dialog-close"]'],
    title: 'One click shows it in the note',
    body: 'The quote is highlighted where it sits in the document, so it can be checked in context before anyone relies on it.',
  },
  {
    target: '[data-tour="requirement"]',
    before: [requirement(5)],
    title: 'A person can say no',
    body: 'Nora also offered a line about her past diet. This criterion is about how the drug will be used, so Jordan rejected it and kept the line saying she will continue.',
  },
  {
    target: '[data-tour="requirement"]',
    before: [requirement(3)],
    title: 'Read the way the payer reads it',
    body: 'Cigna wants the BMI from before any GLP-1. The one Nora found is from after her 2025 Saxenda, so nobody verified it and the requirement is missing.',
  },
  {
    target: '[data-tour="tasks"]',
    title: 'The gap becomes a task',
    body: 'Each gap is a task for Jordan. For the baseline BMI, Jordan has asked the prescriber’s office; nothing else waits on the answer.',
  },
  {
    target: '[data-tour="open-form"]',
    title: 'Ready to type into CoverMyMeds',
    body: "Every CoverMyMeds field and Cigna's questions, filled from the chart with their sources. What the chart can't answer is listed for the prescriber's office.",
  },
  {
    target: '[data-tour="submit"]',
    title: 'The final check is Jordan’s',
    body: 'Open requirements block it for now. Once they are resolved, Jordan checks each answer and its source and submits under Dr. Chen’s name.',
  },
  {
    target: '[data-tour="timeline"]',
    title: 'Every step is on the record',
    body: 'Who did what, and when, from the first read of the chart. An approved request becomes a PDF packet, and the payer’s decision is recorded here too.',
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
