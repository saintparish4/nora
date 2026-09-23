# "completed" and "cancelled" cannot express the difference between a patient
# who came and one who did not turn up, and the no-show rate is both the
# clearest triage signal and the number a practice administrator already feels.
class AddNoShowToAppointments < ActiveRecord::Migration[8.1]
  def up
    # Nothing to migrate: no_show is a new member of an existing string enum,
    # validated in the model rather than constrained in the database.
    say "no_show is now a valid appointment status (see Appointment::STATUSES)"
  end

  def down
    Appointment.where(status: "no_show").update_all(status: "cancelled")
  end
end
