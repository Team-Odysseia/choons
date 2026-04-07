import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url ?? '')
      const isAuthProbe = requestUrl.includes('/auth/me')
      const isLoginRoute = window.location.pathname === '/login'

      if (!isAuthProbe && !isLoginRoute) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default client
