import { z } from 'zod';

// Contracts for every API response the app reads. validateResponse() parses
// against these in development so a backend change fails loudly.

export const RoleSchema = z.enum(['staff', 'clinician', 'admin']);

export const OrganizationSchema = z.object({
  id: z.number(),
  name: z.string(),
  npi: z.string().nullish(),
  timezone: z.string(),
  // The shared synthetic practice behind the public demo.
  demo: z.boolean().optional(),
});

export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  state: z.string().nullish(),
  phone: z.string().nullish(),
  role: RoleSchema.optional(),
  organization: OrganizationSchema.optional(),
});

export const MemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: RoleSchema,
});

export const PageMetaSchema = z.object({
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
  total_pages: z.number(),
});

export const PatientSchema = z.object({
  id: z.number(),
  mrn: z.string().nullish(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  date_of_birth: z.string(),
  sex: z.string().nullish(),
});

export const CoverageSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  member_id: z.string(),
  group_number: z.string().nullish(),
  effective_on: z.string().nullish(),
  primary: z.boolean(),
  plan: z.object({ id: z.number(), name: z.string(), plan_type: z.string().nullish() }),
  payer: z.object({ id: z.number(), name: z.string() }),
});

export const DOCUMENT_KINDS = [
  'office_note',
  'problem_list',
  'medication_history',
  'lab',
  'imaging',
  'letter',
  'other',
] as const;

export const ChartDocumentSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string(),
  occurred_on: z.string().nullish(),
  source: z.enum(['paste', 'upload']),
  original_filename: z.string().nullish(),
  length: z.number(),
  uploaded_by: MemberSchema,
  created_at: z.string(),
  body: z.string().optional(),
});

export const PlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  plan_type: z.string().nullish(),
  payer_id: z.number(),
});

export const PayerSchema = z.object({
  id: z.number(),
  name: z.string(),
  payer_code: z.string().nullish(),
  plans: z.array(PlanSchema),
});

export const CriterionSchema = z.object({
  id: z.number(),
  position: z.number(),
  kind: z.string(),
  text: z.string(),
  optional: z.boolean(),
});

export const PolicyTemplateSchema = z.object({
  id: z.number(),
  item_kind: z.string(),
  item_name: z.string(),
  item_code: z.string().nullish(),
  title: z.string(),
  payer: z.object({ id: z.number(), name: z.string() }).nullish(),
  generic: z.boolean(),
  effective_on: z.string().nullish(),
  source_url: z.string().nullish(),
  notes: z.string().nullish(),
  version: z.number(),
  criteria: z.array(CriterionSchema).optional(),
});

export const PA_STATUSES = [
  'draft',
  'gathering',
  'needs_clarification',
  'ready_for_review',
  'approved',
  'submitted',
  'payer_pending',
  'approved_by_payer',
  'denied',
  'appealed',
  'cancelled',
  'closed',
] as const;
export const PaStatusSchema = z.enum(PA_STATUSES);

export const REQUIREMENT_STATUSES = ['pending', 'met', 'missing', 'unclear', 'not_applicable'] as const;
export const RequirementStatusSchema = z.enum(REQUIREMENT_STATUSES);

export const EvidenceSchema = z.object({
  id: z.number(),
  requirement_id: z.number(),
  document: z.object({
    id: z.number(),
    title: z.string(),
    kind: z.string(),
    occurred_on: z.string().nullish(),
  }),
  excerpt: z.string(),
  start_offset: z.number(),
  end_offset: z.number(),
  confidence: z.number().nullish(),
  extracted_by: z.enum(['rule', 'ai', 'human']),
  rationale: z.string().nullish(),
  verified: z.boolean(),
  verified_by: MemberSchema.nullish(),
  verified_at: z.string().nullish(),
  rejected: z.boolean(),
  rejected_at: z.string().nullish(),
});

export const QuestionAnswerSchema = z.enum(['supported', 'mentioned_only', 'conflicting', 'not_documented']);

/** One payer question explained against the chart. Never stored. */
export const QuestionHelpSchema = z.object({
  question: z.string(),
  plain_language: z.string(),
  what_counts: z.array(z.string()),
  answer: QuestionAnswerSchema,
  findings: z.array(
    z.object({
      document: z.object({ id: z.number(), title: z.string(), kind: z.string(), occurred_on: z.string().nullish() }),
      excerpt: z.string(),
      start_offset: z.number(),
      end_offset: z.number(),
      supports: z.boolean(),
      note: z.string().nullish(),
    })
  ),
  suggested_answer: z.string().nullish(),
  ask_clinician: z.string().nullish(),
  discarded_quotes: z.number(),
  chart_truncated: z.boolean(),
});

export const RequirementSchema = z.object({
  id: z.number(),
  status: RequirementStatusSchema,
  note: z.string().nullish(),
  ai_summary: z.string().nullish(),
  criterion: CriterionSchema,
  reviewed_by: MemberSchema.nullish(),
  reviewed_at: z.string().nullish(),
  evidence: z.array(EvidenceSchema),
});

export const PriorAuthorizationSchema = z.object({
  id: z.number(),
  status: PaStatusSchema,
  item_name: z.string(),
  item_code: z.string().nullish(),
  patient: PatientSchema,
  coverage: CoverageSchema,
  policy: PolicyTemplateSchema,
  requested_by: MemberSchema,
  assigned_to: MemberSchema.nullish(),
  extraction_status: z.enum(['idle', 'running', 'succeeded', 'failed']),
  extraction_error: z.string().nullish(),
  extracted_at: z.string().nullish(),
  submitted_at: z.string().nullish(),
  decided_at: z.string().nullish(),
  payer_reference: z.string().nullish(),
  prep_minutes_reported: z.number().nullish(),
  requirement_counts: z.record(RequirementStatusSchema, z.number()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PriorAuthorizationDetailSchema = PriorAuthorizationSchema.extend({
  requirements: z.array(RequirementSchema),
  approval: z
    .object({
      approved_by: MemberSchema,
      approved_at: z.string(),
      current: z.boolean(),
    })
    .nullish(),
  allowed_transitions: z.array(PaStatusSchema),
});

export const WorkflowEventSchema = z.object({
  id: z.number(),
  event_type: z.string(),
  from_status: z.string().nullish(),
  to_status: z.string().nullish(),
  payload: z.record(z.string(), z.unknown()),
  actor: MemberSchema.nullish(),
  created_at: z.string(),
});

export const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(['open', 'done', 'dismissed']),
  due_on: z.string().nullish(),
  overdue: z.boolean(),
  completed_at: z.string().nullish(),
  assignee: MemberSchema.nullish(),
  subject: z.object({
    type: z.string(),
    id: z.number(),
    item_name: z.string().optional(),
    patient_name: z.string().optional(),
  }),
  created_at: z.string(),
});

export const TodaySchema = z.object({
  counts: z.object({
    by_status: z.record(z.string(), z.number()),
    open_tasks: z.number(),
    my_open_tasks: z.number(),
    overdue_tasks: z.number(),
  }),
  needs_attention: z.array(
    z.object({
      kind: z.string(),
      reason: z.string(),
      action: z.string(),
      prior_authorization: PriorAuthorizationSchema,
    })
  ),
  my_tasks: z.array(TaskSchema),
});

export const MetricsSchema = z.object({
  window_days: z.number(),
  requests_created: z.number(),
  requests_approved: z.number(),
  median_minutes_to_approval: z.number().nullable(),
  median_reported_prep_minutes: z.number().nullable(),
  reported_prep_count: z.number(),
  submitted: z.number(),
  payer_approved: z.number(),
  payer_denied: z.number(),
});

export type Role = z.infer<typeof RoleSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type User = z.infer<typeof UserSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type PageMeta = z.infer<typeof PageMetaSchema>;
export type Patient = z.infer<typeof PatientSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export type ChartDocument = z.infer<typeof ChartDocumentSchema>;
export type Payer = z.infer<typeof PayerSchema>;
export type PolicyTemplate = z.infer<typeof PolicyTemplateSchema>;
export type PaStatus = z.infer<typeof PaStatusSchema>;
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type PriorAuthorization = z.infer<typeof PriorAuthorizationSchema>;
export type PriorAuthorizationDetail = z.infer<typeof PriorAuthorizationDetailSchema>;
export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Today = z.infer<typeof TodaySchema>;
export type QuestionAnswer = z.infer<typeof QuestionAnswerSchema>;
export type QuestionHelp = z.infer<typeof QuestionHelpSchema>;
