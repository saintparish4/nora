class CreateFormAnswers < ActiveRecord::Migration[8.1]
  def change
    # An answer a person gave to one of the plan's questions: what the
    # prescriber's office said (manual), or a correction to Nora's (override).
    create_table :form_answers do |t|
      t.references :prior_authorization, null: false, foreign_key: true
      t.string :link_id, null: false
      t.json :value, null: false
      t.string :origin, null: false
      t.text :note
      t.references :recorded_by, null: false, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :form_answers, %i[prior_authorization_id link_id], unique: true

    # What the final check sent: the request form's fields and the
    # QuestionnaireResponse, as they stood when staff submitted.
    add_column :approvals, :submitted_form, :json
  end
end
