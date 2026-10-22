# Reference data: payers, plans, and the GLP-1 weight-management policy library.
#
# Version 2 (2026-10-22): each payer's initial-authorization criteria for
# adults, taken from its published policy. The sources (URLs, policy numbers,
# dates, file hashes), the payers' own wording, and what changed from version 1
# are in api/evals/evidence/policies/. Payers revise these policies; check the
# source URL on the template before relying on it.
#
# Version 1 templates are never deleted, so a request opened under one keeps
# its criteria; new requests resolve to the highest version. The eval still
# runs on version 1, frozen in api/evals/evidence/library_v1.rb.
#
# Everything is a local, not a constant, so the file can be loaded more than
# once in a process (the demo reset and the specs both do).

payers = {
  "UnitedHealthcare" => [ [ "Choice Plus", "PPO" ], [ "Navigate", "HMO" ] ],
  "Aetna" => [ [ "Open Access Managed Choice", "POS" ] ],
  "Cigna" => [ [ "Open Access Plus", "PPO" ] ],
  # No single Blue policy exists; this plan gets the common baseline below.
  "Blue Cross Blue Shield" => [ [ "Blue Choice PPO", "PPO" ] ],
  "Blue Cross Blue Shield Federal Employee Program" => [ [ "FEP Blue Standard", "PPO" ] ]
}

payers.each do |payer_name, plans|
  payer = Payer.find_or_create_by!(name: payer_name)
  plans.each do |plan_name, plan_type|
    InsurancePlan.find_or_create_by!(payer: payer, name: plan_name) { |p| p.plan_type = plan_type }
  end
end

# --- Vocabulary the rule pass looks for -------------------------------------

comorbidities = [ "hypertension", "HTN", "type 2 diabetes", "T2DM", "dyslipidemia", "hyperlipidemia", "sleep apnea", "OSA", "I10", "E11", "E78" ]
# Cigna's list is closed and longer.
cigna_comorbidities = comorbidities + [ "cardiovascular disease", "coronary artery disease", "CAD", "osteoarthritis", "asthma", "COPD",
                                        "chronic obstructive pulmonary disease", "MASLD", "NAFLD", "fatty liver", "PCOS", "polycystic ovar" ]
# FEP counts established cardiovascular disease on its own.
fep_comorbidities = comorbidities + [ "cardiovascular disease", "coronary heart disease", "coronary artery disease", "myocardial infarction",
                                      "stroke", "cerebrovascular disease", "peripheral artery disease", "angina" ]
activity = [ "physical activity", "exercise", "walking", "walks", "gym", "training", "aerobic", "aerobics", "swimming", "jogging",
             "running", "cycling", "fitness", "treadmill", "yoga", "cardio" ]
diet = [ "reduced-calorie", "calorie", "dietitian", "nutrition", "physical activity", "exercise", "lifestyle" ]
program = [ "weight program", "weight management program", "lifestyle program", "weight loss program", "Teladoc", "dietitian",
            "nutrition coach", "reduced-calorie", "supervised" ]
# Oral weight-management drugs, one group per drug: brand and generic names together.
oral_drugs = [ %w[phentermine Adipex-P Adipex Lomaira], %w[Qsymia], %w[Contrave naltrexone], %w[orlistat Xenical],
               %w[benzphetamine], %w[diethylpropion] ]

bmi = lambda do |list, text|
  { kind: "documented_value", text: text,
    hint: { "bmi_min" => 30, "bmi_min_with_comorbidity" => 27, "comorbidity_terms" => list } }
end
comorbidity = lambda do |list, text|
  { kind: "diagnosis", optional: true, text: text, hint: { "terms" => list } }
end
age = ->(text) { { kind: "age", text: text, hint: { "terms" => [ "DOB", "date of birth", "year-old", "years old" ] } } }
no_glp1 = lambda do |text, also: []|
  { kind: "other", text: text, hint: { "terms" => %w[GLP-1 GLP1] + also, "requires_denial" => true } }
end

# --- Templates -------------------------------------------------------------

upsert_template = lambda do |item_name:, payer:, title:, criteria:, notes:, source_url:, effective_on:|
  template = PolicyTemplate.find_or_initialize_by(item_name: item_name, payer: payer, version: 2)
  template.update!(item_kind: "medication", title: title, notes: notes, source_url: source_url, effective_on: effective_on)
  template.criteria.where("position > ?", criteria.size).destroy_all
  criteria.each_with_index do |attrs, i|
    criterion = template.criteria.find_or_initialize_by(position: i + 1)
    criterion.update!(kind: attrs[:kind], text: attrs[:text], optional: attrs.fetch(:optional, false), hint: attrs[:hint] || {})
  end
  template
end

drugs = { "Wegovy" => "semaglutide 2.4 mg", "Zepbound" => "tirzepatide", "Saxenda" => "liraglutide 3 mg" }
payer = ->(name) { Payer.find_by!(name: name) }

# UnitedHealthcare: one program for all three. 2026 P 1114-23.
drugs.each do |item, generic|
  upsert_template.call(
    item_name: item, payer: payer.call("UnitedHealthcare"), effective_on: Date.new(2026, 10, 1),
    title: "#{item} (#{generic}) for weight loss, UnitedHealthcare",
    source_url: "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/drugs-pharmacy/commercial/r-z/PA-Notification-Weight-Loss.pdf",
    notes: "UnitedHealthcare program 2026 P 1114-23. It applies only to plans that cover weight-loss drugs; " \
           "check the member's benefit first.",
    criteria: [
      { kind: "indication", text: "The drug is requested for weight loss.",
        hint: { "terms" => [ "weight management", "weight loss", "weight-loss" ] } },
      age.call(item == "Zepbound" ? "The patient is older than 16." : "The patient is 12 or older."),
      { kind: "plan_of_care", text: "The drug will be used as an adjunct to lifestyle modification (diet or caloric restriction, exercise, behavioral support, or a community program).",
        hint: { "terms" => [ "diet", "lifestyle", "physical activity", "exercise", "behavioral" ] } },
      bmi.call(comorbidities, "BMI of 30 kg/m2 or greater, or 27 kg/m2 or greater with a weight-related comorbidity."),
      comorbidity.call(comorbidities, "If BMI is 27 to 29.9: a weight-related comorbidity is documented (for example dyslipidemia, hypertension, type 2 diabetes, or sleep apnea).")
    ]
  )
end

# Aetna: one bulletin per drug, same adult criteria. 4774-C (Wegovy), 6192-C
# (Zepbound), 1227-C (Saxenda). Aetna prints no effective date.
{ "Wegovy" => "https://www.aetna.com/products/rxnonmedicare/data/2026/Wegovy_PA_with_Limit_4774-C_P08-2025_v5.html",
  "Zepbound" => "https://www.aetna.com/products/rxnonmedicare/data/2025/Zepbound_PA_with_Limit_6192-C_P08-2025.html",
  "Saxenda" => "https://www.aetna.com/products/rxnonmedicare/data/2025/Saxenda_PA_with_Limit_1227-C_P08-2025.html" }.each do |item, url|
  upsert_template.call(
    item_name: item, payer: payer.call("Aetna"), effective_on: nil, source_url: url,
    title: "#{item} (#{drugs[item]}) for weight loss, Aetna",
    notes: "Aetna asks for the BMI at baseline: before any weight-loss drug, if the patient has taken one. " \
           "The bulletin prints no effective date; check it is current.",
    criteria: [
      age.call("The patient is 18 or older."),
      { kind: "lifestyle",
        text: "The patient has taken part in a comprehensive weight management program (behavioral modification, reduced-calorie diet, and increased physical activity, with continuing follow-up) for at least 6 months before drug therapy.",
        hint: { "terms" => diet, "min_months" => 6, "also_requires" => activity } },
      bmi.call(comorbidities, "Baseline BMI of 30 kg/m2 or greater, or 27 kg/m2 or greater with a weight-related comorbidity. Baseline means before any weight-loss drug. Documentation required."),
      comorbidity.call(comorbidities, "If baseline BMI is 27 to 29.9: a weight-related comorbidity is documented (for example hypertension, type 2 diabetes, or dyslipidemia).")
    ]
  )
end

# Cigna: one policy per drug, same adult criteria. IP0814 (Wegovy), IP0816
# (Zepbound), IP0813 (liraglutide).
{ "Wegovy" => "ip_0814_coveragepositioncriteria_weight_loss_wegovy_injection.pdf",
  "Zepbound" => "ip_0816_coveragepositioncriteria_weight_loss_zepbound.pdf",
  "Saxenda" => "ip_0813_coveragepositioncriteria_weight_loss_liraglutide.pdf" }.each do |item, file|
  criteria = [
    age.call("The patient is 18 or older."),
    { kind: "lifestyle", text: "The patient has tried behavioral modification and dietary restriction for at least 3 months.",
      hint: { "terms" => diet, "min_months" => 3 } },
    bmi.call(cigna_comorbidities, "Baseline BMI of 30 kg/m2 or greater, or 27 kg/m2 or greater with a weight-related comorbidity. Baseline means before any GLP-1 or GLP-1/GIP drug."),
    comorbidity.call(cigna_comorbidities, "If baseline BMI is 27 to 29.9: one of hypertension, type 2 diabetes, dyslipidemia, obstructive sleep apnea, cardiovascular disease, knee osteoarthritis, asthma, COPD, MASLD/NAFLD, polycystic ovarian syndrome, or coronary artery disease."),
    { kind: "plan_of_care", text: "The drug will be used with behavioral modification and a reduced-calorie diet.",
      hint: { "terms" => [ "diet", "lifestyle", "behavioral", "calorie" ] } },
    no_glp1.call("Not used together with another GLP-1 or GLP-1/GIP agonist (not covered).", also: [ "GIP" ])
  ]
  if item == "Saxenda"
    criteria << { kind: "preferred_product", optional: true,
                  text: "Employer plans, brand Saxenda only: the patient tried generic liraglutide and cannot take it because of an inactive ingredient." }
  end
  upsert_template.call(
    item_name: item, payer: payer.call("Cigna"), effective_on: Date.new(2026, 9, 1),
    source_url: "https://static.cigna.com/assets/chcp/pdf/coveragePolicies/pharmacy/#{file}",
    title: "#{item} (#{drugs[item]}) for weight loss, Cigna",
    notes: "Some Cigna plans use a BMI 32 or BMI 35 policy instead, and many exclude weight-loss drugs. Check the member's benefit.",
    criteria: criteria
  )
end

# BCBS Federal Employee Program: 5.99.030 (Saxenda, Wegovy), 5.99.031 (Zepbound).
fep = payer.call("Blue Cross Blue Shield Federal Employee Program")
fep_program = { kind: "lifestyle", text: "The patient has taken part in a comprehensive weight management program (for example Teladoc). No minimum duration.",
                hint: { "terms" => program } }
fep_tail = [
  no_glp1.call("No dual therapy with another GLP-1 receptor agonist."),
  { kind: "other", text: "No dual therapy with another prior-authorization weight-loss medication.",
    hint: { "terms" => [ "weight-loss medication", "weight loss medication", "weight-loss drug", "weight loss drug" ], "requires_denial" => true } }
]
fep_bmi = bmi.call(fep_comorbidities, "BMI of 30 kg/m2 or greater, or 27 kg/m2 or greater with established cardiovascular disease or a weight-related comorbidity.")
fep_comorbidity = comorbidity.call(fep_comorbidities, "If BMI is 27 to 29.9: established cardiovascular disease, or a weight-related comorbidity (for example type 2 diabetes, dyslipidemia, or hypertension).")
%w[Wegovy Saxenda].each do |item|
  upsert_template.call(
    item_name: item, payer: fep, effective_on: Date.new(2026, 7, 1),
    source_url: "https://www.fepblue.org/-/media/PDFs/Medical-Policies/2026/July-2026/Pharmacy-Policies/Remove--Replace/5_99_030-Saxenda-Wegovy.pdf",
    title: "#{item} (#{drugs[item]}) for weight loss, BCBS Federal Employee Program",
    notes: "FEP policy 5.99.030. These are the adult criteria; patients 12 to 17 have their own BMI rules.",
    criteria: [ age.call("The patient is 18 or older."), fep_bmi, fep_comorbidity, fep_program ] + fep_tail
  )
end
upsert_template.call(
  item_name: "Zepbound", payer: fep, effective_on: Date.new(2026, 7, 1),
  source_url: "https://www1.fepblue.org/-/media/PDFs/Medical-Policies/2026/July-2026/Pharmacy-Policies/Remove--Replace/599031-Zepbound-tirzepatide.pdf",
  title: "Zepbound (tirzepatide) for weight loss, BCBS Federal Employee Program",
  notes: "FEP policy 5.99.031. The preferred-product list it refers to (Appendix 3) is not in the published policy.",
  criteria: [
    age.call("The patient is 18 or older."), fep_bmi, fep_comorbidity,
    { kind: "prior_trial",
      text: "Inadequate response, intolerance, or contraindication to at least two oral weight-management drugs (for example phentermine, Qsymia, benzphetamine, diethylpropion).",
      hint: { "drugs" => oral_drugs, "requires_outcome" => true, "min_distinct" => 2 } },
    fep_program
  ] + fep_tail + [
    { kind: "preferred_product", text: "The patient tried the preferred product(s), unless there is a medical exception." }
  ]
)

# Any other payer: only what all four published policies share. Not a policy.
drugs.each do |item, generic|
  upsert_template.call(
    item_name: item, payer: nil, effective_on: nil, source_url: nil,
    title: "#{item} (#{generic}) for weight loss, common baseline",
    notes: "No published policy on file for this payer. These are the criteria UnitedHealthcare, Aetna, Cigna and the " \
           "BCBS Federal Employee Program share; check the payer's own before submitting.",
    criteria: [
      age.call("The patient is 18 or older."),
      bmi.call(comorbidities, "BMI of 30 kg/m2 or greater, or 27 kg/m2 or greater with a weight-related comorbidity."),
      comorbidity.call(comorbidities, "If BMI is 27 to 29.9: a weight-related comorbidity is documented (for example hypertension, type 2 diabetes, or dyslipidemia)."),
      { kind: "lifestyle", text: "The patient has taken part in a weight management program with diet and physical activity.",
        hint: { "terms" => diet, "also_requires" => activity } }
    ]
  )
end

puts "Policy library: #{PolicyTemplate.count} templates, #{PolicyCriterion.count} criteria, #{Payer.count} payers."
