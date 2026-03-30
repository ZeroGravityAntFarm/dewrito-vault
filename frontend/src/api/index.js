// Public game versions
export const getGameVersions = () =>
  apiFetch('/api_v2/game-versions')
function getCookie(name) {
  const decoded = decodeURIComponent(document.cookie)
  const parts = decoded.split(';')
  for (let c of parts) {
    c = c.trim()
    if (c.startsWith(name + '=')) return c.substring(name.length + 1)
  }
  return ''
}

function authHeaders() {
  const token = getCookie('Authorization')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

// Featured
export const getFeatured = () =>
  apiFetch('/api_v2/featured')

// Maps
export const getMapsNewest = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/maps/newest?${p}`)
}

export const getMapsDownloaded = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/maps/downloaded?${p}`)
}

export const getMapsOldest = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/maps/oldest?${p}`)
}

export const getMapsPopular = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/maps/popular?${p}`)
}

export const getMap = (id) =>
  apiFetch(`/api_v2/maps/${id}`)

export const searchMaps = (query, page = 1, size = 21) =>
  apiFetch(`/api_v2/maps/search/${encodeURIComponent(query)}?page=${page}&size=${size}`)

export const deleteMap = (id) =>
  apiFetch(`/api_v2/maps/${id}`, { method: 'DELETE', headers: authHeaders() })

export const updateMap = (id, data) =>
  apiFetch(`/api_v2/maps/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams(data),
  })

// Variants
export const getVariants = (page = 1, size = 21) =>
  apiFetch(`/api_v2/variants/?page=${page}&size=${size}`)

export const getVariantsNewest = (page = 1, size = 21) =>
  apiFetch(`/api_v2/variants/newest?page=${page}&size=${size}`)

export const getVariantsOldest = (page = 1, size = 21) =>
  apiFetch(`/api_v2/variants/oldest?page=${page}&size=${size}`)

export const getVariant = (id) =>
  apiFetch(`/api_v2/variants/${id}`)

export const searchVariants = (query, page = 1, size = 21) =>
  apiFetch(`/api_v2/variants/search/${encodeURIComponent(query)}?page=${page}&size=${size}`)

// Mods
export const getMods = (page = 1, size = 21, tag = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  return apiFetch(`/api_v2/mods?${p}`)
}

export const getModsNewest = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/mods/newest?${p}`)
}

export const getModsOldest = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/mods/oldest?${p}`)
}

export const getModsDownloaded = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/mods/downloaded?${p}`)
}

export const getModsPopular = (page = 1, size = 21, tag = '', version = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  if (version) p.set('version', version)
  return apiFetch(`/api_v2/mods/popular?${p}`)
}

export const getMod = (id) =>
  apiFetch(`/api_v2/mods/${id}`)

export const searchMods = (query, page = 1, size = 21) =>
  apiFetch(`/api_v2/mods/search/${encodeURIComponent(query)}?page=${page}&size=${size}`)

export const deleteMod = (id) =>
  apiFetch(`/api_v2/mods/${id}`, { method: 'DELETE', headers: authHeaders() })

export const updateMod = (id, data) =>
  apiFetch(`/api_v2/mods/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams(data),
  })

// Prefabs
export const getPrefabs = (page = 1, size = 21, tag = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  return apiFetch(`/api_v2/prefabs?${p}`)
}

export const getPrefabsNewest = (page = 1, size = 21, tag = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  return apiFetch(`/api_v2/prefabs/newest?${p}`)
}

export const getPrefabsDownloaded = (page = 1, size = 21, tag = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  return apiFetch(`/api_v2/prefabs/downloaded?${p}`)
}

export const getPrefabsOldest = (page = 1, size = 21, tag = '') => {
  const p = new URLSearchParams({ page, size })
  if (tag) p.set('tag', tag)
  return apiFetch(`/api_v2/prefabs/oldest?${p}`)
}

export const searchPrefabs = (query, page = 1, size = 21) =>
  apiFetch(`/api_v2/prefabs/search/${encodeURIComponent(query)}?page=${page}&size=${size}`)

export const getPrefab = (id) =>
  apiFetch(`/api_v2/prefabs/${id}`)

export const deletePrefab = (id) =>
  apiFetch(`/api_v2/prefabs/${id}`, { method: 'DELETE', headers: authHeaders() })

// Image management
export const getImageCount = (type, id) =>
  apiFetch(`/api_v2/images/${type}/${id}`)

export const addImages = (type, id, formData) =>
  apiFetch(`/api_v2/images/${type}/${id}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

export const deleteImage = (type, id, index) =>
  apiFetch(`/api_v2/images/${type}/${id}/${index}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

export const reorderImages = (type, id, order) =>
  apiFetch(`/api_v2/images/${type}/${id}/reorder`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  })

// Users
export const getUser = (id) =>
  apiFetch(`/api_v2/users/${id}`)

export const getUserByName = (name) =>
  apiFetch(`/api_v2/username/${encodeURIComponent(name)}`)

export const getCurrentUser = () =>
  apiFetch('/api_v2/me', { headers: authHeaders() })

export const getUserStats = (id) =>
  apiFetch(`/api_v2/users/stats/${id}`)

export const getUserPublicMaps = (userId) =>
  apiFetch(`/api_v2/users/${userId}/maps`)

export const getUserPublicMods = (userId) =>
  apiFetch(`/api_v2/users/${userId}/mods`)

export const uploadAvatar = (formData) =>
  apiFetch('/api_v2/users/avatar', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

export const getUserMaps = () =>
  apiFetch('/api_v2/usermaps/', { headers: authHeaders() })

export const getUserMods = () =>
  apiFetch('/api_v2/usermods/', { headers: authHeaders() })

export const getUserPrefabs = () =>
  apiFetch('/api_v2/userprefabs/', { headers: authHeaders() })

export const updateUser = (data) =>
  apiFetch('/api_v2/users', {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams({ userAbout: data.about ?? '' }),
  })

// Webhooks
export const getWebhooks = () =>
  apiFetch('/api_v2/user/webhook/', { headers: authHeaders() })

export const createWebhook = (data) => {
  const fd = new URLSearchParams(data)
  return apiFetch('/api_v2/user/webhook', {
    method: 'POST',
    headers: authHeaders(),
    body: fd,
  })
}

export const updateWebhook = (id, data) => {
  const fd = new URLSearchParams(data)
  return apiFetch(`/api_v2/user/webhook/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: fd,
  })
}

export const deleteWebhook = (id) =>
  apiFetch(`/api_v2/user/webhook/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

// Votes
export const getVotes = (mapId) =>
  apiFetch(`/api_v2/vote/${mapId}/`)

export const castVote = (mapId, vote) =>
  apiFetch(`/api_v2/vote/${mapId}/${vote}`, {
    method: 'POST',
    headers: authHeaders(),
  })

export const getModVotes = (modId) =>
  apiFetch(`/api_v2/vote/mod/${modId}/`)

export const castModVote = (modId, vote) =>
  apiFetch(`/api_v2/vote/mod/${modId}/${vote}`, {
    method: 'POST',
    headers: authHeaders(),
  })

export const getUpvotedMaps = () =>
  apiFetch('/api_v2/votes/me/maps', { headers: authHeaders() })

export const getUpvotedMods = () =>
  apiFetch('/api_v2/votes/me/mods', { headers: authHeaders() })

export const getMyModVote = (modId) =>
  apiFetch(`/api_v2/votes/me/mod/${modId}`, { headers: authHeaders() })

export const getMyMapVote = (mapId) =>
  apiFetch(`/api_v2/votes/me/map/${mapId}`, { headers: authHeaders() })

// Auth
export const login = async (username, password, totpCode = null) => {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  if (totpCode) form.append('totp_code', totpCode)
  const res = await fetch('/api_v2/login', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

// 2FA
export const get2FAStatus = () =>
  apiFetch('/api_v2/users/2fa/status', { headers: authHeaders() })

export const setup2FA = () =>
  apiFetch('/api_v2/users/2fa/setup', { method: 'POST', headers: authHeaders() })

export const enable2FA = (code) =>
  apiFetch('/api_v2/users/2fa/enable', {
    method: 'POST',
    headers: authHeaders(),
    body: new URLSearchParams({ totp_code: code }),
  })

export const disable2FA = (code) =>
  apiFetch('/api_v2/users/2fa/disable', {
    method: 'POST',
    headers: authHeaders(),
    body: new URLSearchParams({ totp_code: code }),
  })

export const changePassword = (newPassword, currentPassword = null, totpCode = null) => {
  const body = new URLSearchParams({ userPassword: newPassword })
  if (currentPassword) body.append('currentPassword', currentPassword)
  if (totpCode) body.append('totp_code', totpCode)
  return apiFetch('/api_v2/users/password', {
    method: 'PATCH',
    headers: authHeaders(),
    body,
  })
}

// Admin
export const adminGetUsers = () =>
  apiFetch('/api_v2/admin/users', { headers: authHeaders() })

export const adminToggleUser = (userId) =>
  apiFetch(`/api_v2/admin/users/${userId}/toggle`, { method: 'PATCH', headers: authHeaders() })

export const adminPromoteUser = (userId) =>
  apiFetch(`/api_v2/admin/users/${userId}/promote`, { method: 'PATCH', headers: authHeaders() })

export const adminGetSettings = () =>
  apiFetch('/api_v2/admin/settings', { headers: authHeaders() })

export const adminUpdateSettings = (registrationEnabled, webhookDomain = '') =>
  apiFetch('/api_v2/admin/settings', {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams({ registration_enabled: registrationEnabled, webhook_domain: webhookDomain }),
  })

export const adminGetStats = () =>
  apiFetch('/api_v2/admin/stats', { headers: authHeaders() })

export const getTags = () =>
  apiFetch('/api_v2/tags')

export const adminAddTag = (tagType, tag) =>
  apiFetch(`/api_v2/admin/settings/tags/${tagType}`, {
    method: 'POST',
    headers: authHeaders(),
    body: new URLSearchParams({ tag }),
  })

export const adminRemoveTag = (tagType, tag) =>
  apiFetch(`/api_v2/admin/settings/tags/${tagType}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: new URLSearchParams({ tag }),
  })

export const adminRenameTag = (tagType, oldTag, newTag) =>
  apiFetch(`/api_v2/admin/settings/tags/${tagType}/rename`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams({ old_tag: oldTag, new_tag: newTag }),
  })

export const adminAddGameVersion = (version) =>
  apiFetch('/api_v2/admin/settings/game-versions', {
    method: 'POST',
    headers: authHeaders(),
    body: new URLSearchParams({ version }),
  })

export const adminRemoveGameVersion = (version) =>
  apiFetch('/api_v2/admin/settings/game-versions', {
    method: 'DELETE',
    headers: authHeaders(),
    body: new URLSearchParams({ version }),
  })

export const adminRenameGameVersion = (oldVersion, newVersion) =>
  apiFetch('/api_v2/admin/settings/game-versions/rename', {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams({ old_version: oldVersion, new_version: newVersion }),
  })

export const adminRenameUser = (userId, newName) =>
  apiFetch(`/api_v2/admin/users/${userId}/rename`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams({ new_name: newName }),
  })

export const adminSetUserPassword = (userId, password = '') =>
  apiFetch(`/api_v2/admin/users/${userId}/password`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: new URLSearchParams({ password }),
  })

export const register = (name, password) =>
  apiFetch('/api_v2/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })

// Upload — returns a promise that resolves on completion
export const uploadMap = (formData) =>
  apiFetch('/api_v2/upload/map', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

export const uploadPrefab = (formData) =>
  apiFetch('/api_v2/upload/prefab', {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

export const getMapChangelog = (id) =>
  apiFetch(`/api_v2/maps/${id}/changelog`)

export const getModChangelog = (id) =>
  apiFetch(`/api_v2/mods/${id}/changelog`)

export const updateMapFile = (id, formData, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const token = getCookie('Authorization')
    xhr.open('POST', `/api_v2/update/map/${id}`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
      else reject(new Error(xhr.responseText || `HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })

export const updateModFile = (id, formData, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const token = getCookie('Authorization')
    xhr.open('POST', `/api_v2/update/mod/${id}`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
      else reject(new Error(xhr.responseText || `HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })

export const updateModFileChunked = (id, file, changelog, onProgress) => {
  const fd = new FormData()
  fd.append('files', file)
  fd.append('changelog', changelog)
  return updateModFile(id, fd, onProgress)
}

export const uploadModWithProgress = (formData, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const token = getCookie('Authorization')
    xhr.open('POST', '/api_v2/upload/mod')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
      else reject(new Error(xhr.responseText || `HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })
}

export const uploadModChunked = uploadModWithProgress

// Cookie helpers (exported for auth store)
export function setCookie(name, value, days) {
  const exp = new Date()
  exp.setDate(exp.getDate() + days)
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp.toUTCString()}; SameSite=None; Secure; path=/`
}

export function removeCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

// Utility
export function timeSince(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`
  const years = Math.floor(months / 12)
  return `${years} year${years !== 1 ? 's' : ''}`
}
