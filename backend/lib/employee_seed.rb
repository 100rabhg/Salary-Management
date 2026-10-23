# Deterministic generator for synthetic employees.
#
# Headcount per country and per job title is allocated from fixed weights, so
# every country / department / job title group has the same size on every run.
# Randomness (from a fixed seed) is used only for names, salary variation,
# employment type and hire date.
#
# #call inserts with ON CONFLICT DO NOTHING on lower(email): re-running never
# duplicates or overwrites existing employees, including ones HR has edited.
class EmployeeSeed
  Result = Data.define(:inserted, :skipped)

  DEFAULT_RANDOM_SEED = 20261023
  BATCH_SIZE = 1_000
  EMAIL_DOMAIN = "acme.example" # .example is reserved (RFC 2606); never a real address
  HIRE_DATES = Date.new(2012, 1, 1)..Date.new(2025, 12, 31)
  HIRE_DATE_SPAN_DAYS = (HIRE_DATES.end - HIRE_DATES.begin).to_i + 1

  # Relative headcount; at count: 10_000 these are the exact numbers.
  COUNTRY_WEIGHTS = {
    "US" => 3000, "IN" => 2000, "GB" => 1200, "DE" => 1000,
    "FR" => 800, "JP" => 700, "SG" => 700, "NL" => 600
  }.freeze

  # Converts a USD-denominated base salary into a plausible local-currency
  # salary (pay level and exchange rate combined). Generation only; never stored.
  COUNTRY_PAY_FACTORS = {
    "US" => "1.00", "GB" => "0.60", "DE" => "0.62", "FR" => "0.52",
    "NL" => "0.60", "IN" => "25", "JP" => "75", "SG" => "1.05"
  }.transform_values(&:to_r).freeze

  # Salaries are rounded to whole units of this size.
  ROUNDING_STEP = Hash.new(100).merge("INR" => 1_000, "JPY" => 1_000).freeze

  JobTitle = Data.define(:department, :title, :base_salary_usd, :weight)

  JOB_TITLES = [
    JobTitle.new("Engineering", "Software Engineer", 120_000, 14),
    JobTitle.new("Engineering", "Senior Software Engineer", 155_000, 9),
    JobTitle.new("Engineering", "Engineering Manager", 185_000, 3),
    JobTitle.new("Engineering", "QA Engineer", 95_000, 5),
    JobTitle.new("Product", "Product Manager", 140_000, 4),
    JobTitle.new("Product", "Product Designer", 115_000, 3),
    JobTitle.new("Sales", "Account Executive", 90_000, 8),
    JobTitle.new("Sales", "Sales Manager", 130_000, 3),
    JobTitle.new("Marketing", "Marketing Specialist", 75_000, 5),
    JobTitle.new("Marketing", "Marketing Manager", 120_000, 2),
    JobTitle.new("Finance", "Accountant", 75_000, 4),
    JobTitle.new("Finance", "Financial Analyst", 85_000, 3),
    JobTitle.new("People", "HR Generalist", 70_000, 3),
    JobTitle.new("People", "Recruiter", 72_000, 3),
    JobTitle.new("Operations", "Operations Analyst", 72_000, 5),
    JobTitle.new("Operations", "Operations Manager", 115_000, 2),
    JobTitle.new("Customer Support", "Support Specialist", 50_000, 10),
    JobTitle.new("Customer Support", "Support Team Lead", 68_000, 3)
  ].freeze

  FIRST_NAMES = %w[
    Aarav Abebe Ada Aiko Alex Amara Ana Andrei Arjun Bea Carlos Chen Dara Elena
    Emeka Farah Hana Hugo Ines Ivan Jonas Kai Leila Lucas Maya Mei Mateo Nadia
    Noah Olu Priya Rafael Rina Sam Sofia Tariq Uma Wei Yara Zane
  ].freeze

  LAST_NAMES = %w[
    Adeyemi Alvarez Bauer Bose Chandra Costa Dubois Eriksen Fischer Garcia Gupta
    Haddad Ito Jansen Kapoor Kim Kowalski Larsen Lim Martin Mehta Moreau Mueller
    Nakamura Novak Okafor Patel Petrov Reyes Rossi Sato Schmidt Silva Singh Smith
    Tanaka Tan Visser Wong Yamada
  ].freeze

  attr_reader :count

  def initialize(count:, random_seed: DEFAULT_RANDOM_SEED)
    @count = count
    @random_seed = random_seed
  end

  def call
    inserted = attributes.each_slice(BATCH_SIZE).sum do |batch|
      rows_by_email = batch.index_by { |row| row.fetch(:email) }

      Employee.transaction do
        inserted_employees = Employee.insert_all(
          batch.map { |row| row.except(:salary, :currency) },
          unique_by: :index_employees_on_lower_email,
          returning: [ :id, :email ]
        ).to_a

        salary_rows = inserted_employees.map do |employee|
          row = rows_by_email.fetch(employee.fetch("email"))
          {
            employee_id: employee.fetch("id"),
            salary: row.fetch(:salary),
            currency: row.fetch(:currency),
            effective_on: row.fetch(:hire_date)
          }
        end
        EmployeeSalary.insert_all(salary_rows) if salary_rows.any?

        inserted_employees.length
      end
    end
    Result.new(inserted:, skipped: count - inserted)
  end

  def attributes
    @attributes ||= generate
  end

  # Largest-remainder apportionment: splits total across weights so the parts
  # sum exactly to total. Ties break by key order, keeping it deterministic.
  def self.allocate(total, weights)
    sum = weights.values.sum
    exact = weights.transform_values { |weight| Rational(total * weight, sum) }
    counts = exact.transform_values(&:floor)
    leftover = total - counts.values.sum
    keys = weights.keys
    exact.sort_by { |key, value| [ counts[key] - value, keys.index(key) ] }
      .first(leftover).each { |key, _| counts[key] += 1 }
    counts
  end

  private

  def generate
    random = Random.new(@random_seed)
    title_weights = JOB_TITLES.to_h { |job| [ job, job.weight ] }
    index = 0

    self.class.allocate(count, COUNTRY_WEIGHTS).flat_map do |country_code, country_count|
      self.class.allocate(country_count, title_weights).flat_map do |job, job_count|
        Array.new(job_count) { build_row(random, country_code, job, index += 1) }
      end
    end
  end

  def build_row(random, country_code, job, index)
    first_name = FIRST_NAMES.sample(random:)
    last_name = LAST_NAMES.sample(random:)
    employment_type = pick_employment_type(random)
    currency = Country.currency_for(country_code)

    {
      first_name:,
      last_name:,
      email: format("%s.%s.%05d@%s", first_name, last_name, index, EMAIL_DOMAIN).downcase,
      job_title: job.title,
      department: job.department,
      country_code:,
      currency:,
      salary: salary_for(random, job, country_code, currency, employment_type),
      employment_type:,
      hire_date: HIRE_DATES.begin + random.rand(HIRE_DATE_SPAN_DAYS)
    }
  end

  # 85% full time, 8% part time, 7% contract.
  def pick_employment_type(random)
    roll = random.rand(100)
    if roll < 85 then "full_time"
    elsif roll < 93 then "part_time"
    else "contract"
    end
  end

  # Exact arithmetic throughout (Integer and Rational, no Float).
  def salary_for(random, job, country_code, currency, employment_type)
    amount = job.base_salary_usd * COUNTRY_PAY_FACTORS.fetch(country_code) * Rational(random.rand(80..120), 100)
    amount *= Rational(random.rand(50..60), 100) if employment_type == "part_time"
    step = ROUNDING_STEP[currency]
    BigDecimal((amount / step).round * step)
  end
end
