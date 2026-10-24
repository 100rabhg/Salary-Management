# The paginated, filtered employee directory, with each employee's current
# and pending salary record joined in one query (no N+1).
#
# Both salary lookups are LATERAL subqueries that walk the
# (employee_id, effective_on) index. "Today" is passed in as a bind value
# rather than using CURRENT_DATE, so it follows the app's business time zone.
class EmployeeDirectoryQuery
  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100
  SORTS = {
    "name" => %w[last_name first_name],
    "hire_date" => %w[hire_date],
    "created_at" => %w[created_at]
  }.freeze
  FILTERS = %i[country_code department job_title employment_type].freeze

  Result = Data.define(:records, :page, :per_page, :total) do
    def total_pages = (total.to_f / per_page).ceil
  end

  SALARY_COLUMNS = %w[id salary currency effective_on].freeze

  def initialize(params, today: Date.current)
    @params = params
    @today = today
  end

  def call
    scope = filtered(Employee.all)
    per_page = @params[:per_page].present? ? @params[:per_page].to_i.clamp(1, MAX_PER_PAGE) : DEFAULT_PER_PAGE
    page = [ @params[:page].to_i, 1 ].max

    records = scope
      .select("employees.*", *salary_select("current"), *salary_select("pending"))
      .joins(lateral_join("current", "effective_on <= :today", "DESC"))
      .joins(lateral_join("pending", "effective_on > :today", "ASC"))
      .order(order_clause)
      .limit(per_page)
      .offset((page - 1) * per_page)

    Result.new(records:, page:, per_page:, total: scope.count)
  end

  private

  def filtered(scope)
    FILTERS.each do |filter|
      value = @params[filter].presence
      scope = scope.where(filter => value) if value
    end
    search(scope)
  end

  # Matches any part of the first name, last name, full name or email,
  # case-insensitively. LIKE wildcards in the input are escaped.
  def search(scope)
    term = @params[:q].to_s.strip
    return scope if term.empty?

    pattern = "%#{Employee.sanitize_sql_like(term)}%"
    scope.where(
      "employees.first_name ILIKE :pattern OR employees.last_name ILIKE :pattern " \
      "OR (employees.first_name || ' ' || employees.last_name) ILIKE :pattern OR employees.email ILIKE :pattern",
      pattern:
    )
  end

  def salary_select(name)
    SALARY_COLUMNS.map { |column| "#{name}_salary.#{column} AS #{name}_salary_#{column}" }
  end

  def lateral_join(name, condition, direction)
    Employee.sanitize_sql_array([ <<~SQL.squish, { today: @today } ])
      LEFT JOIN LATERAL (
        SELECT #{SALARY_COLUMNS.join(', ')} FROM employee_salaries
        WHERE employee_salaries.employee_id = employees.id AND #{condition}
        ORDER BY effective_on #{direction} LIMIT 1
      ) #{name}_salary ON true
    SQL
  end

  def order_clause
    columns = SORTS.fetch(@params[:sort].to_s, SORTS["name"])
    direction = @params[:direction].to_s.downcase == "desc" ? :desc : :asc
    columns.to_h { |column| [ column, direction ] }.merge(id: direction)
  end
end
