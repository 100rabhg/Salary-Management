require "rails_helper"

# Database-level examples cover the employee table's invariants: NOT NULL,
# column lengths and case-insensitive unique email.
# Every other rule is model-only (see docs/architecture.md).
RSpec.describe Employee do
  def valid_attributes(**overrides)
    {
      first_name: "Ada",
      last_name: "Okafor",
      email: "ada.okafor@acme.example",
      job_title: "Software Engineer",
      department: "Engineering",
      country_code: "GB",
      employment_type: "full_time",
      hire_date: Date.new(2020, 3, 1)
    }.merge(overrides)
  end

  # Writes a row with raw SQL, bypassing validations, normalization and type
  # casting, to prove the database enforces an invariant on its own.
  def insert_without_rails(**overrides)
    now = Time.current
    attributes = valid_attributes(created_at: now, updated_at: now, **overrides)
    connection = described_class.connection
    values = attributes.values.map { |value| connection.quote(value) }
    connection.execute(
      "INSERT INTO employees (#{attributes.keys.join(', ')}) VALUES (#{values.join(', ')})"
    )
  end

  def errors_for(attributes, field)
    employee = described_class.new(attributes)
    employee.validate
    employee.errors[field]
  end

  it "is valid with valid attributes" do
    expect(described_class.new(valid_attributes)).to be_valid
  end

  describe "required fields" do
    %i[
      first_name last_name email job_title department country_code
      employment_type hire_date
    ].each do |field|
      it "requires #{field}" do
        expect(errors_for(valid_attributes(field => nil), field)).to be_present
      end

      it "rejects a NULL #{field} in the database" do
        expect { insert_without_rails(field => nil) }.to raise_error(ActiveRecord::NotNullViolation)
      end
    end

    %i[first_name last_name email job_title department].each do |field|
      it "rejects a blank #{field}" do
        expect(errors_for(valid_attributes(field => "   "), field)).to include("can't be blank")
      end
    end
  end

  describe "text fields" do
    it "strips surrounding whitespace" do
      employee = described_class.new(valid_attributes(first_name: "  Ada ", job_title: " QA Engineer "))

      expect(employee.first_name).to eq("Ada")
      expect(employee.job_title).to eq("QA Engineer")
    end

    it "limits names to 100 characters in the model and the database" do
      long_name = "a" * 101

      expect(described_class.new(valid_attributes(last_name: long_name))).not_to be_valid
      expect { insert_without_rails(last_name: long_name) }.to raise_error(ActiveRecord::ValueTooLong)
    end
  end

  describe "email" do
    it "is stored lowercase without surrounding whitespace" do
      employee = described_class.create!(valid_attributes(email: "  Ada.Okafor@ACME.example "))

      expect(employee.reload.email).to eq("ada.okafor@acme.example")
    end

    it "must look like an email address" do
      expect(described_class.new(valid_attributes(email: "not-an-email"))).not_to be_valid
    end

    it "is unique regardless of case in the model" do
      described_class.create!(valid_attributes)
      duplicate = described_class.new(valid_attributes(email: "ADA.OKAFOR@acme.example"))

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to include("has already been taken")
    end

    it "is unique regardless of case in the database" do
      described_class.create!(valid_attributes)

      expect { insert_without_rails(email: "ADA.OKAFOR@ACME.EXAMPLE") }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end
  end

  describe "country" do
    it "rejects an unsupported country" do
      attributes = valid_attributes(country_code: "BR")

      expect(errors_for(attributes, :country_code)).to include("is not a supported country")
    end
  end

  describe "employment type" do
    it "accepts the allowed types" do
      %w[full_time part_time contract].each do |type|
        expect(described_class.new(valid_attributes(employment_type: type))).to be_valid
      end
    end

    it "rejects other values" do
      expect(errors_for(valid_attributes(employment_type: "intern"), :employment_type)).to include("is not included in the list")
    end
  end

  describe "hire date" do
    it "accepts today" do
      expect(described_class.new(valid_attributes(hire_date: Date.current))).to be_valid
    end

    it "rejects a date in the future" do
      expect(errors_for(valid_attributes(hire_date: Date.current + 1), :hire_date)).to include("can't be in the future")
    end
  end
end
