class AddFhirIdToPatients < ActiveRecord::Migration[8.1]
  def change
    # The patient's id on the FHIR server Nora reads the chart from (Epic, a
    # local HAPI server, or the demo bundles).
    add_column :patients, :fhir_id, :string
    add_index :patients, [ :organization_id, :fhir_id ], unique: true
  end
end
