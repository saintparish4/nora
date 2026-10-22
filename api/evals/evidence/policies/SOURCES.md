# Sources

Retrieved 2026-10-22. Each document was fetched from the payer's own site,
saved, and its text extracted; every quote in `criteria.yml` was matched
against the saved text. The documents themselves are not committed (they are
the payers' copyright); the hash identifies the exact file read, so a later
reader can tell whether the payer has changed it.

| Payer | Drugs | Policy | Number | Date printed | SHA-256 (first 16) | URL |
|---|---|---|---|---|---|---|
| UnitedHealthcare | Wegovy, Zepbound, Saxenda | Prior Authorization/Notification: Weight Loss/Appetite Suppression Medication | 2026 P 1114-23 | Effective 10/1/2026; P&T 8/2026 | 94c9e1197d1e647e | https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/drugs-pharmacy/commercial/r-z/PA-Notification-Weight-Loss.pdf |
| Aetna | Wegovy | Wegovy PA with Limit | 4774-C P08-2025 v5 | Posted August 20, 2026 (no effective date printed) | bb4b67094225c144 | https://www.aetna.com/products/rxnonmedicare/data/2026/Wegovy_PA_with_Limit_4774-C_P08-2025_v5.html |
| Aetna | Zepbound | Zepbound PA with Limit | 6192-C P08-2025 | Posted December 12, 2025 | d5f5b797e1444870 | https://www.aetna.com/products/rxnonmedicare/data/2025/Zepbound_PA_with_Limit_6192-C_P08-2025.html |
| Aetna | Saxenda | Saxenda PA with Limit | 1227-C P08-2025 | Posted December 12, 2025 | 2303bb137cee392c | https://www.aetna.com/products/rxnonmedicare/data/2025/Saxenda_PA_with_Limit_1227-C_P08-2025.html |
| Cigna | Saxenda / liraglutide | Weight Loss – GLP-1 Agonists – Liraglutide | IP0813 | Effective 09/01/2026 | c75d24702be012e8 | https://static.cigna.com/assets/chcp/pdf/coveragePolicies/pharmacy/ip_0813_coveragepositioncriteria_weight_loss_liraglutide.pdf |
| Cigna | Wegovy | Weight Loss – GLP-1 Agonists – Wegovy Injection | IP0814 | Effective 09/01/2026 | 7cb5ad5b72ff0f76 | https://static.cigna.com/assets/chcp/pdf/coveragePolicies/pharmacy/ip_0814_coveragepositioncriteria_weight_loss_wegovy_injection.pdf |
| Cigna | Zepbound | Weight Loss – GLP-1 Agonists – Zepbound | IP0816 | Effective 09/01/2026 | 5c28ee634772cff8 | https://static.cigna.com/assets/chcp/pdf/coveragePolicies/pharmacy/ip_0816_coveragepositioncriteria_weight_loss_zepbound.pdf |
| BCBS Federal Employee Program | Saxenda, Wegovy | Saxenda Wegovy | 5.99.030 | Effective July 1, 2026 | db41e0733b4d1c6a | https://www.fepblue.org/-/media/PDFs/Medical-Policies/2026/July-2026/Pharmacy-Policies/Remove--Replace/5_99_030-Saxenda-Wegovy.pdf |
| BCBS Federal Employee Program | Zepbound | Zepbound | 5.99.031 | Effective July 1, 2026 | c99619697b8b5cd7 | https://www1.fepblue.org/-/media/PDFs/Medical-Policies/2026/July-2026/Pharmacy-Policies/Remove--Replace/599031-Zepbound-tirzepatide.pdf |

## Choices and gaps

- **Blue Cross Blue Shield** is a federation of independent plans. The Federal
  Employee Program was chosen because it is one national plan with public,
  dated, per-drug policies. Other Blue plans differ.
- **Aetna** keeps several versions of each bulletin online and prints no
  effective date. The most recently posted version of each was used. No 2026
  revision was found for Zepbound or Saxenda. Which version applies to which
  formulary is unverified. Some plans use a stricter BMI-35 policy (6450-C);
  not used here.
- **UnitedHealthcare**'s program applies only to plans that cover weight-loss
  drugs. The "Nonformulary Wegovy/Zepbound" criteria for other plans were not
  found. Its 8/2026 change log mentions a new regulatory program, also not
  found.
- **Cigna** plans may use BMI-32 or BMI-35 variants (IP0621, IP0739, and
  per-drug BEO policies), depending on the employer.
- **FEP**'s Zepbound preferred-product list (Appendix 3) is not in the
  policy; it points to a Caremark document not fetched.
- Every payer says the member's benefit plan document controls. Many plans
  exclude weight-loss drugs entirely; no policy here says whether a given
  patient is covered.
