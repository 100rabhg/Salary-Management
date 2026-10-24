// App configuration from Vite environment variables (see .env.example).
// Values are fixed at build time.
const env = import.meta.env

export const config = {
  apiBaseUrl: (env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  appName: env.VITE_APP_NAME || 'ACME Salary',
  hrUser: {
    name: env.VITE_HR_USER_NAME || 'Jordan Rivera',
    role: env.VITE_HR_USER_ROLE || 'HR Manager',
  },
}
