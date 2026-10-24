class EnforceSalaryRecordRules < ActiveRecord::Migration[8.1]
  def change
    # One salary record per employee per date: two records on the same day
    # would make "current salary" ambiguous. The unique index also serves the
    # history and current-salary lookups the old (employee_id, effective_on, id)
    # index served.
    remove_index :employee_salaries, [ :employee_id, :effective_on, :id ],
      name: "index_employee_salaries_on_employee_and_effective_date"
    add_index :employee_salaries, [ :employee_id, :effective_on ], unique: true,
      name: "index_employee_salaries_on_employee_and_effective_date"

    # Optimistic locking: a save based on an outdated copy of the row fails
    # instead of silently overwriting another HR user's edit.
    add_column :employees, :lock_version, :integer, null: false, default: 0
    add_column :employee_salaries, :lock_version, :integer, null: false, default: 0
  end
end
