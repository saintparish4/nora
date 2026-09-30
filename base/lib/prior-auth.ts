/**
 * Display rules for the prior authorization workflow: labels, tones, and the
 * reasons an action is unavailable. Pure functions so they can be tested
 * without rendering anything.
 */
import type {
  Evidence,
  PaStatus,
  PriorAuthorizationDetail,
  Requirement,
  RequirementStatus,
  Role,
} from '@/types';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export const PA_STATUS_LABELS: Record<PaStatus, string> = {
  draft: 'Draft',
  gathering: 'Gathering evidence',
  needs_clarification: 'Needs clarification',
  ready_for_review: 'Ready for approval',
  approved: 'Approved',
  submitted: 'Submitted',
  payer_pending: 'With payer',
  approved_by_payer: 'Payer approved',
  denied: 'Denied',
  appealed: 'Appealed',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

export const PA_STATUS_TONES: Record<PaStatus, Tone> = {
  draft: 'neutral',
  gathering: 'info',
  needs_clarification: 'warning',
  ready_for_review: 'info',
  approved: 'success',
  submitted: 'info',
  payer_pending: 'info',
  approved_by_payer: 'success',
  denied: 'danger',
  appealed: 'warning',
  cancelled: 'neutral',
  closed: 'neutral',
};

export const REQUIREMENT_LABELS: Record<RequirementStatus, string> = {
  pending: 'Needs review',
  met: 'Met',
  missing: 'Missing',
  unclear: 'Unclear',
  not_applicable: 'Not applicable',
};

export const REQUIREMENT_TONES: Record<RequirementStatus, Tone> = {
  pending: 'info',
  met: 'success',
  missing: 'danger',
  unclear: 'warning',
  not_applicable: 'neutral',
};

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

export const EXTRACTED_BY_LABELS: Record<Evidence['extracted_by'], string> = {
  rule: 'Found by rule',
  ai: 'Suggested by model',
  human: 'Added by staff',
};

export const TRANSITION_LABELS: Partial<Record<PaStatus, string>> = {
  submitted: 'Mark submitted',
  payer_pending: 'Payer is reviewing',
  approved_by_payer: 'Payer approved',
  denied: 'Payer denied',
  appealed: 'Appeal filed',
  cancelled: 'Cancel request',
  closed: 'Close',
};

const EDITABLE_STATUSES: PaStatus[] = ['draft', 'gathering', 'needs_clarification', 'ready_for_review', 'approved'];

/** Evidence and requirements can change in these statuses (an edit voids approval). */
export function isEditable(status: PaStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

const APPROVER_ROLES: Role[] = ['clinician', 'admin'];

export function canApprove(role: Role | undefined): boolean {
  return role !== undefined && APPROVER_ROLES.includes(role);
}

/** Requirements a person still has to act on before approval. */
export function unresolvedRequirements(pa: Pick<PriorAuthorizationDetail, 'requirements'>): Requirement[] {
  return pa.requirements.filter((r) => r.status !== 'met' && r.status !== 'not_applicable');
}

/**
 * Why the Approve button is disabled, or null when it can be pressed. Mirrors
 * the server's rules so the reason shows before a request is made; the server
 * still decides.
 */
export function approvalBlocker(pa: PriorAuthorizationDetail, role: Role | undefined): string | null {
  if (pa.status === 'approved' && pa.approval?.current) return 'Already approved.';
  if (!canApprove(role)) return 'Only a clinician or an admin can approve.';
  const open = unresolvedRequirements(pa);
  if (open.length > 0) {
    return `${open.length} requirement${open.length === 1 ? '' : 's'} still need${open.length === 1 ? 's' : ''} to be met or marked not applicable.`;
  }
  if (pa.status !== 'ready_for_review') return 'Only a request that is ready for approval can be approved.';
  return null;
}

const PACKET_STATUSES: PaStatus[] = ['approved', 'submitted', 'payer_pending', 'approved_by_payer', 'denied', 'appealed', 'closed'];

/** Mirrors the server: a packet exists once approved, and while approved only if nothing changed since. */
export function packetAvailable(pa: Pick<PriorAuthorizationDetail, 'status' | 'approval'>): boolean {
  if (!pa.approval || !PACKET_STATUSES.includes(pa.status)) return false;
  return pa.status !== 'approved' || pa.approval.current;
}

/** Why a requirement cannot be marked met yet, or null. */
export function metBlocker(requirement: Requirement): string | null {
  const verified = requirement.evidence.some((e) => e.verified && !e.rejected);
  return verified ? null : 'Verify at least one piece of evidence first.';
}

/** Evidence ordered for review: unreviewed first, then verified, rejected last. */
export function sortEvidence(evidence: Evidence[]): Evidence[] {
  const rank = (e: Evidence) => (e.rejected ? 2 : e.verified ? 1 : 0);
  return [...evidence].sort((a, b) => rank(a) - rank(b) || (b.confidence ?? 0) - (a.confidence ?? 0) || a.id - b.id);
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Splits a document body into plain and highlighted runs for the given
 * [start, end) ranges. Overlapping or out-of-range ranges are clamped and
 * merged rather than trusted.
 */
export function highlightSegments(body: string, ranges: Array<[number, number]>): TextSegment[] {
  const clean = ranges
    .map(([s, e]) => [Math.max(0, Math.min(s, body.length)), Math.max(0, Math.min(e, body.length))] as [number, number])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  const merged: Array<[number, number]> = [];
  for (const range of clean) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) segments.push({ text: body.slice(cursor, s), highlighted: false });
    segments.push({ text: body.slice(s, e), highlighted: true });
    cursor = e;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), highlighted: false });
  return segments;
}

export function describeEvent(eventType: string, payload: Record<string, unknown>, toStatus?: string | null): string {
  switch (eventType) {
    case 'created':
      return 'Request created';
    case 'status_changed':
      return `Status: ${toStatus ? PA_STATUS_LABELS[toStatus as PaStatus] ?? toStatus : 'changed'}`;
    case 'extraction_started':
      return 'Evidence extraction started';
    case 'extraction_succeeded': {
      const found = Number(payload.rule ?? 0) + Number(payload.ai ?? 0);
      const dropped = Number(payload.unverifiable_quotes ?? 0);
      return `Extraction finished: ${found} excerpt${found === 1 ? '' : 's'} found${dropped ? `, ${dropped} unverifiable quote${dropped === 1 ? '' : 's'} discarded` : ''}`;
    }
    case 'extraction_failed':
      return 'Extraction failed';
    case 'evidence_added':
      return 'Evidence added by staff';
    case 'evidence_verified':
      return 'Evidence verified';
    case 'evidence_rejected':
      return 'Evidence rejected';
    case 'requirement_reviewed':
      return `Requirement marked ${REQUIREMENT_LABELS[payload.to as RequirementStatus]?.toLowerCase() ?? payload.to}`;
    case 'approved':
      return 'Approved';
    case 'approval_invalidated':
      return 'Approval voided: content changed';
    case 'assigned':
      return 'Reassigned';
    case 'packet_downloaded':
      return 'Packet downloaded';
    case 'task_created':
      return 'Follow-up task opened';
    case 'task_completed':
      return 'Follow-up task closed';
    default:
      return eventType.replaceAll('_', ' ');
  }
}
