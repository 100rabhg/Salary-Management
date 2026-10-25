Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      get "meta", to: "meta#show"
      get "exchange_rates/current", to: "exchange_rates#current"

      scope "insights", controller: "insights", as: "insights" do
        get "summary"
        get "department_costs"
        get "role_salary_ranges"
        get "country_salary_distribution"
      end

      resources :employees, only: %i[index show create update destroy] do
        resources :salaries, only: %i[index create update destroy], controller: "employee_salaries"
      end
    end
  end
end
