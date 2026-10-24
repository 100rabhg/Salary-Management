module Api
  module V1
    # An employee's salary records. Every write runs under the employee row
    # lock (see EmployeeSalary#save_with_lock).
    class EmployeeSalariesController < BaseController
      def index
        render json: { data: SalaryRecordSerializer.history(employee.employee_salaries.to_a) }
      end

      def create
        record = EmployeeSalary.new(salary_params.except(:lock_version).merge(employee:))
        save(record, status: :created)
      end

      def update
        record.assign_attributes(salary_params)
        save(record, status: :ok)
      end

      def destroy
        if record.destroy_with_lock
          head :no_content
        else
          render_validation_errors(record)
        end
      end

      private

      def save(record, status:)
        if record.save_with_lock
          render status:, json: { data: SalaryRecordSerializer.history(employee.employee_salaries.reload.to_a) }
        else
          render_validation_errors(record)
        end
      end

      def employee
        @employee ||= Employee.find(params[:employee_id])
      end

      def record
        @record ||= employee.employee_salaries.find(params[:id])
      end

      def salary_params
        params.expect(salary_record: %i[salary currency effective_on lock_version])
      end
    end
  end
end
