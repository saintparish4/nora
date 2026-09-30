# Reference data: payers, plans, and the GLP-1 obesity policy library.
#
# The criteria below are a common baseline compiled for development and
# demos. They are NOT any payer's actual policy. Replace each template with
# the payer's current published criteria before real use, and set source_url.

ILLUSTRATIVE_NOTE = "Illustrative criteria for development and demos. Not this payer's published policy; " \
                    "replace with the current policy and set the source URL before real use.".freeze
GENERIC_NOTE = "Common baseline for GLP-1 weight-management requests. Payer policies vary; " \
               "check the payer's current criteria before submitting.".freeze

PAYERS = {
  "UnitedHealthcare" => [ [ "Choice Plus", "PPO" ], [ "Navigate", "HMO" ] ],
  "Aetna" => [ [ "Open Access Managed Choice", "POS" ] ],
  "Cigna" => [ [ "Open Access Plus", "PPO" ] ],
  "Blue Cross Blue Shield" => [ [ "Blue Choice PPO", "PPO" ] ]
}.freeze

PAYERS.each do |payer_name, plans|
  payer = Payer.find_or_create_by!(name: payer_name)
  plans.each do |plan_name, plan_type|
    InsurancePlan.find_or_create_by!(payer: payer, name: plan_name) { |p| p.plan_type = plan_type }
  end
end

PRIOR_THERAPY_TERMS = %w[phentermine orlistat Qsymia Contrave naltrexone Saxenda liraglutide Wegovy semaglutide Zepbound tirzepatide].freeze

def glp1_criteria(item_name, extra: [])
  prior_terms = PRIOR_THERAPY_TERMS.reject { |t| t.casecmp?(item_name) }
  [
    { kind: "documented_value",
      text: "BMI of 30 kg/m2 or greater, or 27 kg/m2 or greater with at least one weight-related comorbidity, documented within the last 6 months.",
      hint: { "bmi_min" => 27 } },
    { kind: "diagnosis",
      text: "A diagnosis of obesity or overweight is documented.",
      hint: { "terms" => %w[obesity obese overweight E66 Z68.3 Z68.4] } },
    { kind: "diagnosis", optional: true,
      text: "If BMI is 27 to 29.9: at least one weight-related comorbidity is documented (hypertension, type 2 diabetes, dyslipidemia, obstructive sleep apnea, or cardiovascular disease).",
      hint: { "terms" => [ "hypertension", "HTN", "type 2 diabetes", "T2DM", "dyslipidemia", "hyperlipidemia", "sleep apnea", "OSA", "I10", "E11", "E78" ] } },
    { kind: "lifestyle",
      text: "The patient has taken part in a reduced-calorie diet and increased physical activity program for at least 6 months before this request.",
      hint: { "terms" => [ "reduced-calorie", "calorie", "dietitian", "nutrition", "physical activity", "exercise", "lifestyle" ] } },
    { kind: "prior_trial",
      text: "A trial of at least one other weight-management medication is documented, with its outcome or the reason it was stopped.",
      hint: { "terms" => prior_terms } },
    { kind: "other",
      text: "The medication will not be used together with another GLP-1 receptor agonist.",
      hint: {} }
  ] + extra
end

def upsert_template(item_name:, item_code:, title:, criteria:, notes:, payer: nil)
  template = PolicyTemplate.find_or_initialize_by(item_name: item_name, payer: payer, version: 1)
  template.update!(item_kind: "medication", item_code: item_code, title: title, notes: notes)
  template.criteria.where("position > ?", criteria.size).destroy_all
  criteria.each_with_index do |attrs, i|
    criterion = template.criteria.find_or_initialize_by(position: i + 1)
    criterion.update!(kind: attrs[:kind], text: attrs[:text], optional: attrs.fetch(:optional, false), hint: attrs[:hint])
  end
  template
end

{
  "Wegovy" => "semaglutide 2.4 mg",
  "Zepbound" => "tirzepatide",
  "Saxenda" => "liraglutide 3 mg"
}.each do |item, generic_name|
  upsert_template(item_name: item, item_code: nil, title: "#{item} (#{generic_name}) for chronic weight management",
                  criteria: glp1_criteria(item), notes: GENERIC_NOTE)
end

# A stricter payer variant, so the demo shows a requirement the chart does
# not meet.
upsert_template(
  item_name: "Wegovy", item_code: nil, payer: Payer.find_by!(name: "UnitedHealthcare"),
  title: "Wegovy (semaglutide 2.4 mg) for chronic weight management, UnitedHealthcare (illustrative)",
  notes: ILLUSTRATIVE_NOTE,
  criteria: glp1_criteria("Wegovy", extra: [
    { kind: "prior_trial",
      text: "Trial of a second formulary weight-management alternative is documented, with outcome or reason for discontinuation.",
      hint: { "terms" => PRIOR_THERAPY_TERMS.reject { |t| t.casecmp?("Wegovy") } } }
  ])
)

puts "Policy library: #{PolicyTemplate.count} templates, #{PolicyCriterion.count} criteria, #{Payer.count} payers."
