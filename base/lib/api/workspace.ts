import { z } from 'zod';
import { authFetch, readJson, validateResponse } from './client';
import {
  ChartDocumentSchema,
  CoverageSchema,
  MemberSchema,
  OrganizationSchema,
  PageMetaSchema,
  PatientSchema,
  PayerSchema,
  PolicyTemplateSchema,
  PriorAuthorizationSchema,
  MetricsSchema,
  TaskSchema,
  TodaySchema,
} from './schemas';
import type {
  ChartDocument,
  Coverage,
  DocumentKind,
  Member,
  Organization,
  PageMeta,
  Patient,
  Payer,
  PolicyTemplate,
  PriorAuthorization,
  Role,
  Metrics,
  Task,
  Today,
} from '@/types';

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

// --- Today ------------------------------------------------------------------

export async function getToday(): Promise<Today> {
  const data = await readJson(await authFetch('/api/v1/today'));
  return validateResponse(TodaySchema, data);
}

export async function getMetrics(): Promise<Metrics> {
  const data = await readJson<{ metrics: unknown }>(await authFetch('/api/v1/metrics'));
  return validateResponse(MetricsSchema, data.metrics);
}

// --- Organization and members ----------------------------------------------

export async function getOrganization(): Promise<Organization> {
  const data = await readJson<{ organization: unknown }>(await authFetch('/api/v1/organization'));
  return validateResponse(OrganizationSchema, data.organization);
}

export async function updateOrganization(fields: Partial<Pick<Organization, 'name' | 'npi' | 'timezone'>>): Promise<Organization> {
  const data = await readJson<{ organization: unknown }>(await authFetch('/api/v1/organization', json('PATCH', fields)));
  return validateResponse(OrganizationSchema, data.organization);
}

export async function getMembers(): Promise<Member[]> {
  const data = await readJson<{ members: unknown }>(await authFetch('/api/v1/organization/members'));
  return validateResponse(z.array(MemberSchema), data.members);
}

export interface NewMember {
  email: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  password: string;
}

export async function addMember(member: NewMember): Promise<Member> {
  const data = await readJson<{ member: unknown }>(await authFetch('/api/v1/organization/members', json('POST', member)));
  return validateResponse(MemberSchema, data.member);
}

export async function updateMemberRole(id: number, role: Role): Promise<Member> {
  const data = await readJson<{ member: unknown }>(await authFetch(`/api/v1/organization/members/${id}`, json('PATCH', { role })));
  return validateResponse(MemberSchema, data.member);
}

// --- Patients ---------------------------------------------------------------

export async function getPatients(params: { q?: string; page?: number } = {}): Promise<{ patients: Patient[]; meta: PageMeta }> {
  const data = await readJson<{ patients: unknown; meta: unknown }>(await authFetch(`/api/v1/patients${query(params)}`));
  return {
    patients: validateResponse(z.array(PatientSchema), data.patients),
    meta: validateResponse(PageMetaSchema, data.meta),
  };
}

export interface PatientDetail {
  patient: Patient;
  coverages: Coverage[];
  chart_documents: ChartDocument[];
  prior_authorizations: PriorAuthorization[];
}

export async function getPatient(id: number): Promise<PatientDetail> {
  const data = await readJson<Record<string, unknown>>(await authFetch(`/api/v1/patients/${id}`));
  return {
    patient: validateResponse(PatientSchema, data.patient),
    coverages: validateResponse(z.array(CoverageSchema), data.coverages),
    chart_documents: validateResponse(z.array(ChartDocumentSchema), data.chart_documents),
    prior_authorizations: validateResponse(z.array(PriorAuthorizationSchema), data.prior_authorizations),
  };
}

export interface PatientFields {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mrn?: string;
  sex?: string;
}

export async function createPatient(fields: PatientFields): Promise<Patient> {
  const data = await readJson<{ patient: unknown }>(await authFetch('/api/v1/patients', json('POST', fields)));
  return validateResponse(PatientSchema, data.patient);
}

export interface CoverageFields {
  insurance_plan_id: number;
  member_id: string;
  group_number?: string;
}

export async function addCoverage(patientId: number, fields: CoverageFields): Promise<Coverage> {
  const data = await readJson<{ coverage: unknown }>(
    await authFetch(`/api/v1/patients/${patientId}/coverages`, json('POST', fields))
  );
  return validateResponse(CoverageSchema, data.coverage);
}

// --- Chart documents --------------------------------------------------------

export interface DocumentMeta {
  kind: DocumentKind;
  title?: string;
  occurred_on?: string;
}

export async function pasteChartDocument(patientId: number, meta: DocumentMeta, body: string): Promise<ChartDocument> {
  const data = await readJson<{ chart_document: unknown }>(
    await authFetch(`/api/v1/patients/${patientId}/chart_documents`, json('POST', { ...meta, body }))
  );
  return validateResponse(ChartDocumentSchema, data.chart_document);
}

export async function uploadChartDocument(patientId: number, meta: DocumentMeta, file: File): Promise<ChartDocument> {
  const form = new FormData();
  form.set('kind', meta.kind);
  if (meta.title) form.set('title', meta.title);
  if (meta.occurred_on) form.set('occurred_on', meta.occurred_on);
  form.set('file', file);
  const data = await readJson<{ chart_document: unknown }>(
    await authFetch(`/api/v1/patients/${patientId}/chart_documents`, { method: 'POST', body: form })
  );
  return validateResponse(ChartDocumentSchema, data.chart_document);
}

export async function getChartDocument(id: number): Promise<ChartDocument> {
  const data = await readJson<{ chart_document: unknown }>(await authFetch(`/api/v1/chart_documents/${id}`));
  return validateResponse(ChartDocumentSchema, data.chart_document);
}

export async function deleteChartDocument(id: number): Promise<void> {
  const res = await authFetch(`/api/v1/chart_documents/${id}`, { method: 'DELETE' });
  if (!res.ok) await readJson(res, 'Could not delete the document');
}

// --- Reference data ---------------------------------------------------------

export async function getPayers(): Promise<Payer[]> {
  const data = await readJson<{ payers: unknown }>(await authFetch('/api/v1/payers'));
  return validateResponse(z.array(PayerSchema), data.payers);
}

export async function getPolicyTemplates(): Promise<{ templates: PolicyTemplate[]; items: string[] }> {
  const data = await readJson<{ policy_templates: unknown; items: unknown }>(await authFetch('/api/v1/policy_templates'));
  return {
    templates: validateResponse(z.array(PolicyTemplateSchema), data.policy_templates),
    items: validateResponse(z.array(z.string()), data.items),
  };
}

// --- Tasks ------------------------------------------------------------------

export async function getTasks(params: { status?: string; mine?: boolean; page?: number; prior_authorization_id?: number } = {}): Promise<{ tasks: Task[]; meta: PageMeta }> {
  const data = await readJson<{ tasks: unknown; meta: unknown }>(await authFetch(`/api/v1/tasks${query(params)}`));
  return {
    tasks: validateResponse(z.array(TaskSchema), data.tasks),
    meta: validateResponse(PageMetaSchema, data.meta),
  };
}

export async function updateTask(id: number, fields: { status?: Task['status']; assignee_id?: number }): Promise<Task> {
  const data = await readJson<{ task: unknown }>(await authFetch(`/api/v1/tasks/${id}`, json('PATCH', fields)));
  return validateResponse(TaskSchema, data.task);
}
