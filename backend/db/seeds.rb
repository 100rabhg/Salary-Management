# Idempotent: re-running skips employees that already exist (matched on email)
# and never overwrites records HR has edited. See lib/employee_seed.rb.
result = EmployeeSeed.new(count: 10_000).call
puts "Employees: #{result.inserted} inserted, #{result.skipped} skipped (already present)."
