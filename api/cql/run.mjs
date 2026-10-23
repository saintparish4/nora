// Runs a question set's CQL (as ELM) against one patient's FHIR data and
// prints every expression's value. Called by RequestForm::Cql with JSON on
// stdin:
//
//   { "libraries": [<ELM JSON>, ...], "main": "NoraFepSaxenda",
//     "bundle": <FHIR R4 Bundle of the patient's resources>,
//     "parameters": { "AsOf": "2026-10-23" } }
//
// and prints { "results": { "<expression>": <value>, ... } }, where a FHIR
// resource comes back as { "resourceType", "id" } so the caller can cite it.
import cql from 'cql-execution';
import cqlfhir from 'cql-exec-fhir';

const read = async () => {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return JSON.parse(text);
};

// FHIR resources become references; CQL dates, strings and numbers become JSON.
const plain = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(plain);
  if (value._json && value._json.resourceType) return { resourceType: value._json.resourceType, id: value._json.id ?? null };
  if (value.isDate || value.isDateTime) return value.toString();
  if (typeof value === 'object' && value.constructor === Object) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  if (typeof value === 'object' && typeof value.toString === 'function' && !('_json' in value)) return value.toString();
  return value;
};

// One function rather than top-level await, so it bundles as CommonJS.
const main = async () => {
  const input = await read();
  const repository = new cql.Repository(Object.fromEntries(input.libraries.map((elm) => [elm.library.identifier.id, elm])));
  const library = repository.resolve(input.main, input.version ?? '1.0.0');
  const parameters = { AsOf: cql.Date.parse(input.parameters.AsOf) };
  const executor = new cql.Executor(library, new cql.CodeService({}), parameters);
  const source = cqlfhir.PatientSource.FHIRv401();
  source.loadBundles([input.bundle]);
  const results = await executor.exec(source);
  const [patient] = Object.values(results.patientResults);
  const out = {};
  for (const [name, value] of Object.entries(patient ?? {})) {
    if (name === 'Patient') continue;
    out[name] = plain(value);
  }
  process.stdout.write(JSON.stringify({ results: out }));
};

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
});
