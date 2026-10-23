class Employee < ApplicationRecord
  NAME_MAX_LENGTH = 100

  has_many :employee_salaries, -> { order(effective_on: :desc, id: :desc) }, dependent: :destroy

  enum :employment_type,
    { full_time: "full_time", part_time: "part_time", contract: "contract" },
    validate: true

  normalizes :first_name, :last_name, :job_title, :department, with: ->(value) { value.strip }
  normalizes :email, with: ->(value) { value.strip.downcase }

  validates :first_name, :last_name, :job_title, :department,
    presence: true, length: { maximum: NAME_MAX_LENGTH }
  validates :email, presence: true, length: { maximum: 254 },
    format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false }
  validates :country_code, inclusion: { in: Country.codes, message: "is not a supported country" }
  validates :hire_date, presence: true

  validate :hire_date_not_in_future

  def current_salary_period
    employee_salaries.where("effective_on <= ?", Date.current)
      .order(effective_on: :desc, id: :desc)
      .first
  end

  def current_salary
    current_salary_period&.salary
  end

  def current_currency
    current_salary_period&.currency
  end

  private

  def hire_date_not_in_future
    return unless hire_date && hire_date > Date.current

    errors.add(:hire_date, "can't be in the future")
  end
end
