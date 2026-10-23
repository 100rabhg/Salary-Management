# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_23_184057) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "employee_salaries", force: :cascade do |t|
    t.bigint "employee_id", null: false
    t.decimal "salary", precision: 14, scale: 2, null: false
    t.string "currency", limit: 3, null: false
    t.date "effective_on", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_id", "effective_on", "id"], name: "index_employee_salaries_on_employee_and_effective_date"
    t.check_constraint "salary > 0::numeric", name: "employee_salaries_salary_positive"
  end

  create_table "employees", force: :cascade do |t|
    t.string "first_name", limit: 100, null: false
    t.string "last_name", limit: 100, null: false
    t.string "email", limit: 254, null: false
    t.string "job_title", limit: 100, null: false
    t.string "department", limit: 100, null: false
    t.string "country_code", limit: 2, null: false
    t.string "employment_type", null: false
    t.date "hire_date", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_employees_on_lower_email", unique: true
    t.index ["country_code", "department"], name: "index_employees_on_country_code_and_department"
    t.index ["country_code", "job_title"], name: "index_employees_on_country_code_and_job_title"
    t.index ["department"], name: "index_employees_on_department"
  end

  add_foreign_key "employee_salaries", "employees"
end
