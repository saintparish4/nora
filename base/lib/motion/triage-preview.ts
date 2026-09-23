/**
 * A small, honest mirror of the API's triage behaviour, for the homepage demo.
 *
 * This is **not** the triage engine. The real one lives in the Rails API
 * (`Triage::RedFlagScreenerService` and `Triage::SymptomAnalyzerService`) and
 * combines deterministic rules with a language model. This file only
 * illustrates the shape of that decision for a handful of fixed examples, so a
 * visitor can see what routing looks like without a round trip.
 *
 * It is deliberately limited to pre-written examples rather than accepting free
 * text. A marketing page that appeared to triage whatever somebody typed —
 * without the rule layer, the model, or the safety netting behind it — would be
 * making a medical claim it cannot honour. The live assistant is one click away
 * at /technology, and that is where real symptoms belong.
 */

export type CareLevel = 'routine' | 'urgent' | 'emergency';

export interface TriagePreview {
  /** What a patient might type. */
  phrase: string;
  careLevel: CareLevel;
  /** Where it routes. */
  specialty: string;
  /** Which deterministic rule fired, when one did. */
  rule?: string;
  /** The line the assistant would actually lead with. */
  response: string;
}

export const CARE_LEVEL_META: Record<
  CareLevel,
  { label: string; detail: string; position: number; tone: string; dot: string }
> = {
  routine: {
    label: 'Routine',
    detail: 'Schedule within 1–2 weeks',
    position: 0.18,
    tone: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  urgent: {
    label: 'Urgent',
    detail: 'Seen within 24–48 hours',
    position: 0.56,
    tone: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  emergency: {
    label: 'Emergency',
    detail: 'Call 911 or go to the nearest ER',
    position: 0.94,
    tone: 'text-red-700',
    dot: 'bg-red-500',
  },
};

export const TRIAGE_PREVIEWS: TriagePreview[] = [
  {
    phrase: 'Crushing chest pain and it’s going down my left arm',
    careLevel: 'emergency',
    specialty: 'Emergency Room',
    rule: 'Cardiac rule — no model consulted',
    response:
      'Please seek emergency care now. Call 911 or go to your nearest emergency room. Do not wait for an appointment.',
  },
  {
    phrase: 'A rash on my arm that’s been spreading for a week',
    careLevel: 'routine',
    specialty: 'Dermatology',
    response:
      'Based on what you’ve described, I’d recommend seeing a Dermatology specialist. You can schedule this at your convenience within the next week or two.',
  },
  {
    phrase: 'Fever and a cough I can’t shake after four days',
    careLevel: 'urgent',
    specialty: 'Urgent Care',
    response:
      'Based on what you’ve described, I’d recommend Urgent Care. I’d suggest scheduling an appointment within the next 24–48 hours.',
  },
  {
    phrase: 'I’ve been feeling hopeless and thinking about ending it',
    careLevel: 'emergency',
    specialty: 'Crisis support',
    rule: 'Self-harm rule — no model consulted',
    response:
      'Please seek emergency care now. If you are having thoughts of harming yourself, call or text 988 to reach the Suicide & Crisis Lifeline.',
  },
];
