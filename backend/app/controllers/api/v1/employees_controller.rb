module Api
  module V1
    class EmployeesController < BaseController
      EMPLOYEE_FIELDS = %i[
        first_name last_name email job_title department country_code
        employment_type hire_date
      ].freeze

      def index
        result = EmployeeDirectoryQuery.new(
          params.permit(:q, :page, :per_page, :sort, :direction, *EmployeeDirectoryQuery::FILTERS)
        ).call

        render json: {
          data: result.records.map { |employee| EmployeeSerializer.directory_row(employee) },
          meta: { page: result.page, per_page: result.per_page, total: result.total, total_pages: result.total_pages }
        }
      end

      def show
        render json: EmployeeSerializer.new(employee).as_json
      end

      def create
        attributes = params.expect(employee: [ *EMPLOYEE_FIELDS, first_salary: %i[salary currency] ])
        first_salary_attributes = attributes.delete(:first_salary) || {}
        result = Employee.create_with_first_salary(attributes, first_salary_attributes)

        if result.saved?
          render status: :created, json: EmployeeSerializer.new(result.employee).as_json
        else
          render_validation_errors(result.employee, result.first_salary, prefixes: { result.first_salary => "first_salary" })
        end
      end

      def update
        if employee.update_with_lock(params.expect(employee: [ *EMPLOYEE_FIELDS, :lock_version ]))
          render json: EmployeeSerializer.new(employee).as_json
        else
          render_validation_errors(employee)
        end
      end

      def destroy
        employee.destroy!
        head :no_content
      end

      private

      def employee
        @employee ||= Employee.find(params[:id])
      end
    end
  end
end
