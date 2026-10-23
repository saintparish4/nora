# The clinical question sets staff answer on CoverMyMeds, one per payer and
# drug. `bin/rails questionnaires:build` writes each as a FHIR R4
# Questionnaire into db/questionnaires/*.json; Nora reads those.
#
# Two kinds, and each says which it is:
#
# - form: the plan's own published form, word for word, with its numbering,
#   answer options and branching. Only the BCBS Federal Employee Program
#   publishes forms for these drugs (CVS Caremark, retrieved 2026-10-23).
# - derived: one question per criterion of the payer's published policy
#   (db/seeds/policy_library.rb). UnitedHealthcare, Aetna and Cigna send their
#   questions for these drugs through ePA, behind CoverMyMeds' login, so the
#   wording here is Nora's, not the plan's.
#
# Each item names how Nora answers it (`from`), and carries a plain-language
# explanation for staff without medical training. Nora answers a clinical
# question only from structured chart data or a quote a person verified;
# anything else is "ask the prescriber's office".
#
#   from:
#     age_group, plan_option, dosage_form        hidden items that drive branching, from the chart
#     age_at_least: N                             Patient.birthDate
#     diagnosis                                   problem-list ICD-10 codes
#     bmi_range                                   the latest BMI Observation
#     comorbidities                               problem-list ICD-10 codes
#     criterion: N, when_met: "code"              requirement N, met with verified evidence
#     criterion_bmi: N                            requirement N met: the BMI in its verified quote
#     continuation                                the prescription history for this drug
#     prior_prescription: "Drug"                  the prescription history for another drug
#     brand_or_generic, quantity_over: [n, days], pens_for: days    the prescription
#     ask                                         always the prescriber's office
yes_no = [ [ "yes", "Yes" ], [ "no", "No" ] ].freeze
bmi_ranges = [ [ "under-27", "Less than 27 kg/m2" ], [ "27-29.9", "Between 27 kg/m2 and 29.9 kg/m2" ],
               [ "30-plus", "Greater than or equal to 30kg/m2" ] ].freeze
fep_comorbidities = [
  "Type 2 diabetes mellitus", "Dyslipidemia", "Hypertension", "Congenital heart disease", "Cerebrovascular disease",
  "Peripheral artery disease (PAD)", "Coronary heart disease", "Acute coronary syndrome (ACS)", "Myocardial infarction (MI)",
  "Unstable angina", "Coronary or other arterial revascularization", "Prior percutaneous coronary intervention/coronary bypass surgery",
  "None of the above"
].map { |label| [ label.downcase.gsub(/[^a-z0-9]+/, "-").delete_suffix("-"), label ] }.freeze
glp1_options = [ [ "no-glp1", "No, the patient is not using another GLP-1" ],
                 [ "change", "Yes, this is a change in therapy from another GLP-1 (specify medication)" ],
                 [ "additional", "Yes, this is a request for an additional GLP-1 (specify medication)" ] ].freeze

plain = {
  diagnosis: "Which reason for the drug the chart's diagnosis matches. Nora reads the obesity or overweight code (E66) on the problem list.",
  program: "Has the patient been in a structured weight-loss program (diet and exercise with a coach, dietitian, clinic, or an app like Teladoc)? A suggestion to diet is not a program.",
  glp1: "GLP-1 drugs are the weekly or daily weight and diabetes shots (and Rybelsus pills) listed below. The plan wants to know the patient will not be on two at once.",
  pa_combo: "Will the patient also take another weight-loss drug that needs a prior authorization (like phentermine or Qsymia) at the same time?",
  continuation: "Is this the first time asking for this drug (a new start), or a renewal because the patient has already been taking it for 4 months?",
  bmi: "BMI (body mass index) is in the patient's vitals. Pick the range the most recent BMI falls in.",
  comorbid: "Only asked when BMI is 27 to 29.9. Does the patient have one of these conditions on their problem list?",
  plan_change_zepbound: "Is the patient being moved from Zepbound to this drug? Answered from the prescriptions in the chart.",
  focus_nonformulary: "Blue Focus does not normally cover this drug. The plan wants drugs it does cover that were tried first and did not work.",
  renewal_loss: "For renewals only: has the patient lost at least 5% of their starting weight on the drug? Weights over time are needed; ask the prescriber's office.",
  pens: "From the prescription: how many pens the patient uses in 90 days.",
  quantity: "From the prescription: will the patient need more than the plan's standard amount?",
  brand: "From the prescription: is it written for the brand-name drug or the generic?",
  age: "From the patient's date of birth.",
  ped_bmi: "For patients 12 to 17 only.",
  step_therapy: "The plan prefers Saxenda and Wegovy. Has the patient tried both and had them not work? The chart notes must show it.",
  switch_preferred: "Would the prescriber accept a preferred drug instead? Only the prescriber's office can decide this.",
  oral_trials: "Has the patient tried at least two weight-loss pills (like phentermine or Qsymia) without success, or been unable to take them? The chart notes must show it.",
  lifestyle_6m: "Has the patient been in a diet and exercise program, with follow-up visits, for at least 6 months before this drug? A suggestion to diet is not a program.",
  lifestyle_3m: "Has the patient tried changing eating habits and cutting calories for at least 3 months?",
  baseline_bmi: "The plan wants the BMI from before the patient started any weight-loss drug, not today's if they have already taken one. Nora uses the BMI a person verified for this requirement.",
  plan_of_care: "Will the patient keep up diet and lifestyle changes while taking the drug?",
  indication: "Is the drug for weight loss (and not, for example, sleep apnea or heart disease)?",
  adjunct: "Will the drug be used alongside lifestyle changes like diet, exercise, or a program?",
  no_glp1: "Will the patient take another GLP-1 or GLP-1/GIP drug (like Ozempic or Mounjaro) at the same time? The answer the plan needs is no.",
  generic_lira: "Employer plans, brand Saxenda only: the plan wants generic liraglutide tried first. Only the prescriber's office can say why the generic will not work."
}.freeze

fep_head = lambda do
  [
    { link: "age-group", hidden: true, type: "choice", text: "Patient age group", options: [ [ "12-17", "Age 12-17" ], [ "18-plus", "Age 18 or older" ] ], from: "age_group" },
    { link: "plan-option", hidden: true, type: "choice", text: "FEP plan option",
      options: [ [ "standard-basic", "Blue Standard or Blue Basic" ], [ "focus", "Blue Focus" ] ], from: "plan_option" },
    { link: "brand-generic", type: "choice", text: "Is this request for brand or generic?", options: [ [ "brand", "Brand" ], [ "generic", "Generic" ] ],
      from: "brand_or_generic", plain: plain[:brand] }
  ]
end

fep_glp1 = ->(prefix, criterion) do
  { link: "glp1", prefix: prefix, type: "choice", options: glp1_options, from: "criterion", criterion: criterion, when_met: "no-glp1", plain: plain[:glp1],
    text: "Is the patient currently using another glucagon-like peptide-1 (GLP-1) receptor agonist? Please select answer below." }
end
fep_combo = ->(prefix, criterion) do
  { link: "pa-combination", prefix: prefix, type: "choice", options: yes_no, from: "criterion", criterion: criterion, when_met: "no", plain: plain[:pa_combo],
    text: "Will this medication be used in combination with another *Prior Authorization (PA) medication for weight loss?" }
end
fep_program = ->(prefix, criterion) do
  { link: "program", prefix: prefix, type: "choice", options: yes_no, from: "criterion", criterion: criterion, when_met: "yes", plain: plain[:program],
    text: "Has the patient participated in a comprehensive weight management program such as Teladoc or another weight loss program?" }
end
fep_continuation = lambda do |prefix, with_oral_trials: nil, pediatric: true|
  initiation = [ { question: "continuation", code: "initiation" } ]
  adult = pediatric ? [ { question: "age-group", code: "18-plus" } ] : []
  items = [
    { link: "continuation", prefix: prefix, type: "choice", from: "continuation", plain: plain[:continuation],
      text: "Has the patient been on this medication continuously for the last 4 months excluding samples? Please select answer below:",
      options: [ [ "initiation", "NO – this is INITIATION of therapy" ], [ "continuation", "YES – this is a PA renewal for CONTINUATION of therapy" ] ] },
    pediatric && { link: "initiation-pediatric-bmi", prefix: "a.", type: "choice", from: "ask", plain: plain[:ped_bmi],
      enable_when: initiation + [ { question: "age-group", code: "12-17" } ],
      text: "Age 12-17: What is the patient's body mass index (BMI) percentile for their age? Please select answer below:",
      options: [ [ "under-95", "Less than 95th percentile" ], [ "95-plus", "Greater than or equal to 95th percentile" ] ] },
    { link: "initiation-bmi", prefix: pediatric ? "b. i." : "a.", type: "choice", options: bmi_ranges, from: "bmi_range", plain: plain[:bmi],
      enable_when: initiation + adult,
      text: "#{'Age 18 or older: ' if pediatric}What is the patient's body mass index (BMI) in kilograms per square meter (kg/m2)? Please select answer below:" },
    { link: "initiation-comorbidity", prefix: "ii.", type: "choice", repeats: true, options: fep_comorbidities, from: "comorbidities", plain: plain[:comorbid],
      enable_when: [ { question: "initiation-bmi", code: "27-29.9" } ],
      text: "If BMI is between 27 kg/m2 and 29.9 kg/m2: Does the patient have ONE of the listed weight related comorbid conditions OR established cardiovascular disease? Please select answer below:" },
    with_oral_trials && {
      link: "initiation-oral-trials", prefix: "b.", type: "choice", options: yes_no, from: "criterion", criterion: with_oral_trials, when_met: "yes",
      plain: plain[:oral_trials], enable_when: initiation,
      text: "Does the patient have an intolerance or contraindication or have they had an inadequate treatment response to at least TWO oral medications for weight management? Oral medications for weight management include: benzphetamine, diethylpropion, phentermine, Qsymia, etc."
    },
    pediatric && { link: "continuation-pediatric", prefix: "a.", type: "choice", options: yes_no, from: "ask", plain: plain[:renewal_loss],
      enable_when: [ { question: "continuation", code: "continuation" }, { question: "age-group", code: "12-17" } ],
      text: "Age 12-17: Has the patient maintained clinically significant weight loss?" },
    { link: "continuation-loss", prefix: pediatric ? "b." : "a.", type: "choice", options: yes_no, from: "ask", plain: plain[:renewal_loss],
      enable_when: [ { question: "continuation", code: "continuation" } ] + adult,
      text: "#{'Age 18 or older: ' if pediatric}Has the patient lost at least 5 percent of their baseline body weight?" },
    { link: "continuation-maintained", prefix: "*", type: "choice", options: yes_no, from: "ask", plain: plain[:renewal_loss],
      enable_when: [ { question: "continuation-loss", code: "no" } ],
      text: "If NO, has the patient continued to maintain their initial 5 percent weight loss?" }
  ]
  items.select(&:itself)
end
fep_focus_nonformulary = lambda do |prefix, text: "This is a non-formulary medication. Please provide all formulary alternative medication(s) that have been tried and failed. Please answer below:"|
  { link: "focus-nonformulary", prefix: prefix, type: "choice", from: "ask", plain: plain[:focus_nonformulary],
    enable_when: [ { question: "plan-option", code: "focus" } ], text: text,
    options: [ [ "specified", "Please specify the formulary alternative medication(s) and medical record page number(s)" ],
               [ "none", "The patient has not tried and failed any formulary alternatives." ] ] }
end

fep_source = lambda do |file, title, revised, sha256|
  { kind: "form", publisher: "CVS Caremark for the BCBS Federal Employee Program", title: title, revised: revised, sha256: sha256,
    url: "https://info.caremark.com/content/dam/enterprise/caremark/microsites/dig/pdfs/pa-fep/fep-form/#{file}" }
end

fep_diagnosis = lambda do |options|
  { link: "diagnosis", prefix: "1.", type: "choice", from: "diagnosis", plain: plain[:diagnosis], text: "What is the patient's diagnosis?", options: options }
end

questionnaires = [
  {
    id: "fep-saxenda", payer: "Blue Cross Blue Shield Federal Employee Program", item: "Saxenda",
    title: "Saxenda Prior Approval Request (FEP)", source: fep_source.call("FEP_Form_Saxenda.pdf", "SAXENDA PRIOR APPROVAL REQUEST", "2026-01-12",
                          "ab484c8b271cc4af478a68b257fe8541b88ccafc835423318afe7f0911ac1a3d"),
    items: fep_head.call + [
      fep_diagnosis.call([ [ "chronic", "Chronic weight management" ], [ "obesity", "Obesity, used for chronic weight management" ],
                           [ "elevated-bmi", "Elevated BMI, used for chronic weight management" ], [ "none", "None of the above" ] ]),
      { link: "pens-90-days", prefix: "2.", type: "integer", from: "pens_for", days: 90, plain: plain[:pens],
        text: "How many pre-filled pens will the patient need for 90 days?" },
      fep_program.call("3.", 4), fep_glp1.call("4.", 5), fep_combo.call("5.", 6),
      { link: "change-from-zepbound", prefix: "6.", type: "choice", options: yes_no, from: "prior_prescription", drug: "Zepbound",
        plain: plain[:plan_change_zepbound], enable_when: [ { question: "plan-option", code: "standard-basic" } ],
        text: "Blue Standard / Blue Basic Patient: Is this medication being requested as a change from Zepbound?" },
      fep_focus_nonformulary.call("7. a."),
      { link: "focus-switch-generic", prefix: "b.", type: "choice", options: yes_no, from: "ask", plain: plain[:switch_preferred],
        enable_when: [ { question: "plan-option", code: "focus" } ],
        text: "Would you like to switch to the preferred medication? The preferred medication is generic Saxenda (liraglutide)." }
    ] + fep_continuation.call("6.")
  },
  {
    id: "fep-wegovy", payer: "Blue Cross Blue Shield Federal Employee Program", item: "Wegovy",
    title: "Wegovy Prior Approval Request (FEP)", source: fep_source.call("FEP_Form_Wegovy.pdf", "WEGOVY PRIOR APPROVAL REQUEST", "2026-09-18",
                          "bc9fbc945e04f26bb5d08f1f278c896066d528fcdc06a5da927d33be8403012e")
              .merge(note: "Page 3, for MASH, is left out: Nora covers weight management only."),
    items: fep_head.call + [
      { link: "dosage-form", hidden: true, type: "choice", text: "Dosage form", options: [ [ "injection", "Injection" ], [ "tablet", "Tablets" ] ], from: "dosage_form" },
      { link: "pens-over-limit", type: "choice", options: yes_no, from: "quantity_over", limit: [ 12, 84 ], plain: plain[:quantity],
        enable_when: [ { question: "dosage-form", code: "injection" } ],
        text: "Injection (single-dose pens): Will the patient need more than 12 single-dose pens every 84 days?" },
      { link: "tablets-over-limit", type: "choice", options: yes_no, from: "quantity_over", limit: [ 90, 90 ], plain: plain[:quantity],
        enable_when: [ { question: "dosage-form", code: "tablet" } ],
        text: "Tablets: Will the patient need more than 90 tablets every 90 days?" },
      fep_diagnosis.call([ [ "chronic", "Chronic weight management" ], [ "elevated-bmi", "Elevated BMI, used for chronic weight management" ],
                           [ "obesity", "Obesity, used for chronic weight management" ],
                           [ "cv-risk", "Major adverse cardiovascular risk reduction associated with established CV disease and either obesity or being overweight (chronic weight management)" ],
                           [ "mash", "Noncirrhotic metabolic dysfunction-associated steatohepatitis (MASH)" ], [ "none", "None of the above" ] ]),
      fep_program.call("2.", 4), fep_glp1.call("3.", 5), fep_combo.call("4.", 6),
      { link: "change-from-zepbound", prefix: "6.", type: "choice", options: yes_no, from: "prior_prescription", drug: "Zepbound",
        plain: plain[:plan_change_zepbound], enable_when: [ { question: "plan-option", code: "standard-basic" } ],
        text: "Blue Standard / Blue Basic Patient: Is this medication being requested as a change from Zepbound?" },
      fep_focus_nonformulary.call("7. a.")
    ] + fep_continuation.call("5.")
  },
  {
    id: "fep-zepbound", payer: "Blue Cross Blue Shield Federal Employee Program", item: "Zepbound",
    title: "Weight Loss Medications Prior Approval Request: Zepbound (FEP)",
    source: fep_source.call("FEP_Form_Zepbound.pdf", "WEIGHT LOSS MEDICATIONS PRIOR APPROVAL REQUEST", "2026-01-01",
                          "dda98de411711499e3c1927141ae3dd984d31d36f7e0191b105a98ec644a76bc"),
    items: fep_head.call + [
      { link: "tried-saxenda-wegovy", prefix: "1.", type: "choice", from: "ask", plain: plain[:step_therapy],
        enable_when: [ { question: "plan-option", code: "standard-basic" } ],
        text: "Standard/Basic Option Patient: Has the patient tried and failed Saxenda and Wegovy? Please select answer below:",
        options: [ [ "both", "Yes, Saxenda and Wegovy" ], [ "saxenda", "No, Saxenda only" ], [ "wegovy", "No, Wegovy only" ],
                   [ "neither", "No, the patient has not tried and failed any of these medications." ] ] },
      { link: "switch-preferred", prefix: "2.", type: "choice", from: "ask", plain: plain[:switch_preferred],
        enable_when: [ { question: "plan-option", code: "standard-basic" } ],
        text: "Standard/Basic Option Patient Would you like to switch to a preferred medication? The preferred medications are Saxenda and Wegovy. Please select answer below:",
        options: [ [ "saxenda", "Yes, switch to Saxenda" ], [ "wegovy", "Yes, switch to Wegovy" ], [ "no", "No, do not switch" ],
                   [ "exception", "No, do not switch however the patient has a medical exception" ],
                   [ "medical-director", "No, do not switch however I would like to speak with a medical director to discuss the case" ] ] },
      fep_focus_nonformulary.call("3.", text: "Blue Focus Patient: This is a non-formulary medication. Please provide all formulary alternative medication(s) that have been tried and failed. DOCUMENTATION IS REQUIRED: Please specify medical record page number(s)."),
      { link: "focus-switch-generic", prefix: "4.", type: "choice", options: yes_no, from: "ask", plain: plain[:switch_preferred],
        enable_when: [ { question: "plan-option", code: "focus" } ],
        text: "Blue Focus Patient: Would you like to switch to a preferred medication? The preferred medication is generic Saxenda (liraglutide). Please select answer below:" },
      { link: "pens-over-limit", prefix: "5.", type: "choice", options: yes_no, from: "quantity_over", limit: [ 12, 84 ], plain: plain[:quantity],
        text: "Will the patient need more than 12 single-dose pens every 84 days?" },
      { link: "diagnosis", prefix: "6.", type: "choice", from: "diagnosis", plain: plain[:diagnosis], text: "What is the patient's diagnosis?",
        options: [ [ "chronic", "Chronic weight management" ], [ "obesity", "Obesity, used for chronic weight management" ],
                   [ "elevated-bmi", "Elevated BMI, used for chronic weight management" ],
                   [ "osa", "Moderate to severe obstructive sleep apnea (OSA) with obesity" ], [ "none", "None of the above" ] ] },
      fep_program.call("7.", 5), fep_glp1.call("8.", 6), fep_combo.call("9.", 7)
    ] + fep_continuation.call("10.", with_oral_trials: 4, pediatric: false)
  }
]

derived_source = lambda do |payer, policy, url|
  { kind: "derived", publisher: payer, title: policy, url: url,
    note: "#{payer} sends its questions for this drug through ePA, behind CoverMyMeds' login. These are derived from its published criteria; the wording is Nora's, not the plan's." }
end
bmi_item = ->(criterion_bmi: nil, text:, plain:) do
  { link: "bmi", type: "choice", options: bmi_ranges, text: text, plain: plain }.merge(criterion_bmi ? { from: "criterion_bmi", criterion: criterion_bmi } : { from: "bmi_range" })
end
comorbid_item = ->(criterion, text) do
  { link: "comorbidity", type: "choice", options: yes_no, from: "criterion", criterion: criterion, when_met: "yes", plain: plain[:comorbid],
    enable_when: [ { question: "bmi", code: "27-29.9" } ], text: text }
end

%w[Wegovy Zepbound Saxenda].each do |item|
  questionnaires << {
    id: "uhc-#{item.downcase}", payer: "UnitedHealthcare", item: item, title: "#{item} for weight loss (UnitedHealthcare)",
    source: derived_source.call("UnitedHealthcare", "Program 2026 P 1114-23, effective 10/1/2026",
                                "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/drugs-pharmacy/commercial/r-z/PA-Notification-Weight-Loss.pdf"),
    items: [
      { link: "indication", type: "choice", options: yes_no, from: "criterion", criterion: 1, when_met: "yes", plain: plain[:indication],
        text: "Is the medication being requested for weight loss?" },
      item == "Zepbound" ?
        { link: "age", type: "choice", options: yes_no, from: "age_at_least", age: 17, plain: plain[:age], text: "Is the patient older than 16?" } :
        { link: "age", type: "choice", options: yes_no, from: "age_at_least", age: 12, plain: plain[:age], text: "Is the patient 12 years of age or older?" },
      { link: "adjunct", type: "choice", options: yes_no, from: "criterion", criterion: 3, when_met: "yes", plain: plain[:adjunct],
        text: "Will the medication be used as an adjunct to lifestyle modification (for example dietary or caloric restriction, exercise, behavioral support, or a community-based program)?" },
      bmi_item.call(text: "What is the patient's body mass index (BMI)?", plain: plain[:bmi]),
      comorbid_item.call(5, "If BMI is 27 to 29.9: does the patient have a weight-related comorbidity (for example dyslipidemia, hypertension, type 2 diabetes, or sleep apnea)?")
    ]
  }
end

{ "Wegovy" => "https://www.aetna.com/products/rxnonmedicare/data/2026/Wegovy_PA_with_Limit_4774-C_P08-2025_v5.html",
  "Zepbound" => "https://www.aetna.com/products/rxnonmedicare/data/2025/Zepbound_PA_with_Limit_6192-C_P08-2025.html",
  "Saxenda" => "https://www.aetna.com/products/rxnonmedicare/data/2025/Saxenda_PA_with_Limit_1227-C_P08-2025.html" }.each do |item, url|
  questionnaires << {
    id: "aetna-#{item.downcase}", payer: "Aetna", item: item, title: "#{item} for weight loss (Aetna)",
    source: derived_source.call("Aetna", "#{item} PA with Limit (Aetna Pharmacy Clinical Policy Bulletin)", url),
    items: [
      { link: "age", type: "choice", options: yes_no, from: "age_at_least", age: 18, plain: plain[:age], text: "Is the patient 18 years of age or older?" },
      { link: "program", type: "choice", options: yes_no, from: "criterion", criterion: 2, when_met: "yes", plain: plain[:lifestyle_6m],
        text: "Has the patient participated in a comprehensive weight management program (behavioral modification, reduced-calorie diet, and increased physical activity, with continuing follow-up) for at least 6 months before drug therapy?" },
      bmi_item.call(criterion_bmi: 3, text: "What was the patient's baseline BMI, before any weight-loss drug?", plain: plain[:baseline_bmi]),
      comorbid_item.call(4, "If baseline BMI is 27 to 29.9: does the patient have a weight-related comorbidity (for example hypertension, type 2 diabetes, or dyslipidemia)?")
    ]
  }
end

{ "Wegovy" => "ip_0814_coveragepositioncriteria_weight_loss_wegovy_injection.pdf", "Zepbound" => "ip_0816_coveragepositioncriteria_weight_loss_zepbound.pdf",
  "Saxenda" => "ip_0813_coveragepositioncriteria_weight_loss_liraglutide.pdf" }.each do |item, file|
  items = [
    { link: "age", type: "choice", options: yes_no, from: "age_at_least", age: 18, plain: plain[:age], text: "Is the patient 18 years of age or older?" },
    { link: "behavioral-trial", type: "choice", options: yes_no, from: "criterion", criterion: 2, when_met: "yes", plain: plain[:lifestyle_3m],
      text: "Has the patient engaged in a trial of behavioral modification and dietary restriction for at least 3 months?" },
    bmi_item.call(criterion_bmi: 3, text: "What was the patient's BMI at baseline, before any GLP-1 or GLP-1/GIP drug?", plain: plain[:baseline_bmi]),
    comorbid_item.call(4, "If baseline BMI is 27 to 29.9: does the patient have one of hypertension, type 2 diabetes, dyslipidemia, obstructive sleep apnea, cardiovascular disease, knee osteoarthritis, asthma, COPD, MASLD/NAFLD, polycystic ovarian syndrome, or coronary artery disease?"),
    { link: "with-lifestyle", type: "choice", options: yes_no, from: "criterion", criterion: 5, when_met: "yes", plain: plain[:plan_of_care],
      text: "Will the medication be used with behavioral modification and a reduced-calorie diet?" },
    { link: "other-glp1", type: "choice", options: yes_no, from: "criterion", criterion: 6, when_met: "no", plain: plain[:no_glp1],
      text: "Will the medication be used together with another GLP-1 or GLP-1/GIP agonist?" }
  ]
  if item == "Saxenda"
    items << { link: "generic-liraglutide", type: "choice", options: yes_no, from: "ask", plain: plain[:generic_lira],
               text: "Employer plans, brand Saxenda only: has the patient tried generic liraglutide and been unable to take it because of an inactive ingredient?" }
  end
  questionnaires << {
    id: "cigna-#{item.downcase}", payer: "Cigna", item: item, title: "#{item} for weight loss (Cigna)",
    source: derived_source.call("Cigna", "Coverage policy #{file[/ip_\d+/].upcase.tr('_', '')}, effective 09/01/2026",
                                "https://static.cigna.com/assets/chcp/pdf/coveragePolicies/pharmacy/#{file}"),
    items: items
  }
end

questionnaires
