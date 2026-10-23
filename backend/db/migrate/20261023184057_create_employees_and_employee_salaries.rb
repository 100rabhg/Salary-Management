class CreateEmployeesAndEmployeeSalaries < ActiveRecord::Migration[8.1]
  def change
    create_table :employees do |t|
      t.string :first_name, null: false, limit: 100
      t.string :last_name, null: false, limit: 100
      t.string :email, null: false, limit: 254
      t.string :job_title, null: false, limit: 100
      t.string :department, null: false, limit: 100
      t.string :country_code, null: false, limit: 2
      t.string :employment_type, null: false
      t.date :hire_date, null: false

      t.timestamps
    end

    add_index :employees, "lower(email)", unique: true, name: "index_employees_on_lower_email"
    add_index :employees, :department
    add_index :employees, [ :country_code, :job_title ]
    add_index :employees, [ :country_code, :department ]

    create_table :employee_salaries do |t|
      t.references :employee, null: false, foreign_key: true, index: false
      t.decimal :salary, null: false, precision: 14, scale: 2
      t.string :currency, null: false, limit: 3
      t.date :effective_on, null: false

      t.timestamps
    end

    add_index :employee_salaries, [ :employee_id, :effective_on, :id ],
      name: "index_employee_salaries_on_employee_and_effective_date"
    add_check_constraint :employee_salaries, "salary > 0", name: "employee_salaries_salary_positive"
  end
end
