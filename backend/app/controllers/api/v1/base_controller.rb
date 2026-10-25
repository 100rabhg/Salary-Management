module Api
  module V1
    # Every error response has the same shape:
    #   { "error": { "code": "...", "message": "...", "details": { "field": ["..."] } } }
    class BaseController < ApplicationController
      # A query parameter with a value the API doesn't accept.
      class InvalidParameter < StandardError
        attr_reader :field

        def initialize(field, message)
          @field = field
          super(message)
        end
      end

      # A pinned exchange-rate set the in-memory cache no longer holds.
      class UnknownRatesToken < StandardError; end

      rescue_from UnknownRatesToken do
        render_error :conflict, "unknown_rates_token",
          "These exchange rates are no longer available (the server may have restarted). Load the current rates and try again"
      end

      rescue_from InvalidParameter do |error|
        render_error :unprocessable_content, "invalid_parameter",
          "#{error.field.to_s.humanize} #{error.message}", { error.field => [ error.message ] }
      end

      rescue_from ActiveRecord::RecordNotFound do
        render_error :not_found, "not_found", "The requested record was not found"
      end

      rescue_from ActionController::ParameterMissing do |error|
        render_error :bad_request, "bad_request", error.message
      end

      rescue_from ActiveRecord::StaleObjectError do
        render_error :conflict, "stale_record",
          "Someone else changed this record after you opened it. Reload it and try again"
      end

      # A uniqueness rule lost a race that the model check could not see.
      rescue_from ActiveRecord::RecordNotUnique do
        render_error :conflict, "conflict", "This conflicts with a record that was just saved. Reload and try again"
      end

      private

      def render_error(status, code, message, details = {})
        render status:, json: { error: { code:, message:, details: } }
      end

      # details maps field names (optionally prefixed, e.g. "first_salary.salary")
      # to their messages, so the UI can show each error next to its field.
      def render_validation_errors(*records, prefixes: {})
        details = {}
        records.each do |record|
          prefix = prefixes[record]
          record.errors.to_hash.each do |field, messages|
            details[[ prefix, field ].compact.join(".")] = messages
          end
        end
        message = records.flat_map { |record| record.errors.full_messages }.first || "Validation failed"
        render_error :unprocessable_content, "validation_failed", message, details
      end
    end
  end
end
