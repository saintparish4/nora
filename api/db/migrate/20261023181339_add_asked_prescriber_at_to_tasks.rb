class AddAskedPrescriberAtToTasks < ActiveRecord::Migration[8.1]
  def change
    add_column :tasks, :asked_prescriber_at, :datetime
  end
end
