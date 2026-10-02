import { z } from 'zod';
import { authFetch, readJson, validateResponse } from './client';
import {
  PageMetaSchema,
  PriorAuthorizationDetailSchema,
  PriorAuthorizationSchema,
  QuestionHelpSchema,
  WorkflowEventSchema,
} from './schemas';
import type {
  PageMeta,
  PaStatus,
  PriorAuthorization,
  PriorAuthorizationDetail,
  QuestionHelp,
  RequirementStatus,
  WorkflowEvent,
} from '@/types';

const BASE = '/api/v1/prior_authorizations';

async function detail(res: Response, fallback?: string): Promise<PriorAuthorizationDetail> {
  const data = await readJson<{ prior_authorization: unknown }>(res, fallback);
  return validateResponse(PriorAuthorizationDetailSchema, data.prior_authorization);
}

function post(body?: unknown): RequestInit {
  return { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) };
}

export interface PriorAuthorizationFilters {
  status?: PaStatus | PaStatus[];
  patient_id?: number;
  assigned_to_id?: number;
  open?: boolean;
  page?: number;
}

export async function getPriorAuthorizations(
  filters: PriorAuthorizationFilters = {}
): Promise<{ prior_authorizations: PriorAuthorization[]; meta: PageMeta }> {
  const search = new URLSearchParams();
  for (const status of [filters.status].flat()) if (status) search.append('status[]', status);
  if (filters.patient_id) search.set('patient_id', String(filters.patient_id));
  if (filters.assigned_to_id) search.set('assigned_to_id', String(filters.assigned_to_id));
  if (filters.open) search.set('open', 'true');
  if (filters.page) search.set('page', String(filters.page));
  const qs = search.toString();

  const data = await readJson<{ prior_authorizations: unknown; meta: unknown }>(
    await authFetch(`${BASE}${qs ? `?${qs}` : ''}`)
  );
  return {
    prior_authorizations: validateResponse(z.array(PriorAuthorizationSchema), data.prior_authorizations),
    meta: validateResponse(PageMetaSchema, data.meta),
  };
}

export async function getPriorAuthorization(id: number): Promise<PriorAuthorizationDetail> {
  return detail(await authFetch(`${BASE}/${id}`));
}

export interface NewPriorAuthorization {
  patient_id: number;
  patient_coverage_id: number;
  item_name: string;
  requested_by_id?: number;
  assigned_to_id?: number;
}

export async function createPriorAuthorization(fields: NewPriorAuthorization): Promise<PriorAuthorizationDetail> {
  return detail(await authFetch(BASE, post(fields)), 'Could not create the prior authorization');
}

export async function updatePriorAuthorization(
  id: number,
  fields: { assigned_to_id?: number | null; prep_minutes_reported?: number | null }
): Promise<PriorAuthorizationDetail> {
  return detail(await authFetch(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }));
}

export async function startExtraction(id: number): Promise<PriorAuthorizationDetail> {
  return detail(await authFetch(`${BASE}/${id}/extract`, post()), 'Could not start extraction');
}

export async function approvePriorAuthorization(id: number): Promise<PriorAuthorizationDetail> {
  return detail(await authFetch(`${BASE}/${id}/approve`, post()), 'Could not approve');
}

export async function transitionPriorAuthorization(
  id: number,
  to: PaStatus,
  extra: { payer_reference?: string; prep_minutes_reported?: number } = {}
): Promise<PriorAuthorizationDetail> {
  return detail(await authFetch(`${BASE}/${id}/transition`, post({ to, ...extra })), 'Could not change status');
}

export async function reviewRequirement(
  requirementId: number,
  status: RequirementStatus,
  note?: string
): Promise<PriorAuthorizationDetail> {
  const body: Record<string, unknown> = { status };
  if (note !== undefined) body.note = note;
  return detail(
    await authFetch(`/api/v1/authorization_requirements/${requirementId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    'Could not update the requirement'
  );
}

export async function addEvidence(
  requirementId: number,
  chartDocumentId: number,
  quote: string
): Promise<PriorAuthorizationDetail> {
  return detail(
    await authFetch(`/api/v1/authorization_requirements/${requirementId}/evidence`, post({ chart_document_id: chartDocumentId, quote })),
    'Could not add evidence'
  );
}

export async function reviewEvidence(evidenceId: number, review: 'verify' | 'reject'): Promise<PriorAuthorizationDetail> {
  return detail(
    await authFetch(`/api/v1/authorization_evidence/${evidenceId}`, { method: 'PATCH', body: JSON.stringify({ review }) }),
    'Could not update evidence'
  );
}

export async function getEvents(id: number): Promise<WorkflowEvent[]> {
  const data = await readJson<{ events: unknown }>(await authFetch(`${BASE}/${id}/events`));
  return validateResponse(z.array(WorkflowEventSchema), data.events);
}

/** Downloads the approved packet PDF through the authenticated session. */
export async function downloadPacket(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/${id}/packet`);
  if (!res.ok) await readJson(res, 'Could not download the packet');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `prior-authorization-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Explains one question from the payer's form against this patient's chart.
 * The answer is not saved; staff cite what they want to keep on a requirement.
 */
export async function askPayerQuestion(id: number, question: string): Promise<QuestionHelp> {
  const data = await readJson<{ question_help: unknown }>(
    await authFetch(`${BASE}/${id}/question_help`, post({ question })),
    'Could not get help with that question'
  );
  return validateResponse(QuestionHelpSchema, data.question_help);
}
