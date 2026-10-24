# Serializes an employee's salary history, newest first, with each record's
# status relative to today and its change from the record before it.
class SalaryRecordSerializer
  def self.history(records, today: Date.current)
    chronological = records.sort_by(&:effective_on)
    current = chronological.reverse.find { |record| record.effective_on <= today }
    only_record = chronological.one?

    rows = chronological.each_with_index.map do |record, index|
      previous = chronological[index - 1] if index.positive?
      row(record, previous:, current:, today:, only_record:)
    end
    rows.reverse
  end

  def self.row(record, previous:, current:, today:, only_record:)
    status = if record.effective_on > today then "pending"
    elsif record == current then "current"
    else "past"
    end

    {
      id: record.id,
      salary: SalaryAmount.format(record.salary),
      currency: record.currency,
      effective_on: record.effective_on,
      status:,
      cancellable: status == "pending" && !only_record,
      lock_version: record.lock_version,
      change: change(previous, record)
    }
  end

  # A change is only meaningful between amounts in the same currency.
  def self.change(previous, record)
    return nil unless previous && previous.currency == record.currency

    difference = record.salary - previous.salary
    { amount: SalaryAmount.format(difference), percent: (difference / previous.salary * 100).round(1).to_f }
  end
end
