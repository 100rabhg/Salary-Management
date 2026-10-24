# Allows the React app, served from another origin, to call the API.
# CORS_ORIGINS is a comma-separated list, e.g.
# "https://salary.example.com,http://localhost:5173".
origins = ENV.fetch("CORS_ORIGINS", "http://localhost:5173").split(",").map(&:strip).reject(&:empty?)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*origins)

    resource "/api/*",
      headers: :any,
      methods: %i[get post patch delete options head]
  end
end
