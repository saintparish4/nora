# Payer (or generic) criteria for an item such as a medication. Reference data,
# not PHI, and shared across organizations.
class CreatePolicyLibrary < ActiveRecord::Migration[8.1]
  def change
    create_table :policy_templates do |t|
      t.references :payer, foreign_key: true
      t.string :item_kind, null: false
      t.string :item_name, null: false
      t.string :item_code
      t.string :title, null: false
      t.date :effective_on
      t.string :source_url
      t.text :notes
      t.integer :version, null: false, default: 1
      t.timestamps
    end
    add_index :policy_templates, [ :item_name, :payer_id, :version ], unique: true

    create_table :policy_criteria do |t|
      t.references :policy_template, null: false, foreign_key: true
      t.integer :position, null: false
      t.string :kind, null: false
      t.text :text, null: false
      t.boolean :optional, null: false, default: false
      t.json :hint, null: false, default: {}
      t.timestamps
    end
    add_index :policy_criteria, [ :policy_template_id, :position ], unique: true
  end
end
