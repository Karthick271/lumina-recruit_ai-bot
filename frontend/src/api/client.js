import axios from 'axios'

const http = axios.create({ baseURL: '' })

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

export async function startSession(url) {
  const { data } = await http.post('/api/session/start', { url })
  return data
}

export async function sendMessage(sessionId, message) {
  const { data } = await http.post('/api/chat', { session_id: sessionId, message })
  return data
}

export async function uploadResume(sessionId, file) {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('file', file)
  const { data } = await http.post('/api/upload/resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getJobs() {
  const { data } = await http.get('/api/jobs')
  return data
}

export async function getAdminConfig() {
  const { data } = await http.get('/api/admin/config')
  return data
}

export async function setAdminProvider(provider) {
  const { data } = await http.post('/api/admin/config', { provider })
  return data
}
