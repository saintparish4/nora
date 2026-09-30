# Chart material pasted or uploaded by staff. Only the text is kept: it is what
# evidence cites, and not storing the original file keeps less PHI at rest.
class CreateChartDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :chart_documents do |t|
      t.references :organization, null: false, foreign_key: true
      t.references :patient, null: false, foreign_key: true
      t.references :uploaded_by, null: false, foreign_key: { to_table: :users }
      t.string :kind, null: false
      t.string :title, null: false
      t.date :occurred_on
      t.text :body, null: false
      t.string :source, null: false
      t.string :original_filename
      t.string :content_type
      t.timestamps
    end
  end
end
