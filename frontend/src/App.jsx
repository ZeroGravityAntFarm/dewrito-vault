import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import MapsPage from './pages/MapsPage'
import MapDetail from './pages/MapDetail'
import ModsPage from './pages/ModsPage'
import ModDetail from './pages/ModDetail'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import AboutPage from './pages/AboutPage'
import AdminPage from './pages/AdminPage'
import SearchPage from './pages/SearchPage'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MapsPage sort="newest" />} />

          {/* Maps */}
          <Route path="maps" element={<MapsPage sort="newest" />} />
          <Route path="maps/newest" element={<MapsPage sort="newest" />} />
          <Route path="maps/downloaded" element={<MapsPage sort="downloaded" />} />
          <Route path="maps/oldest" element={<MapsPage sort="oldest" />} />
          <Route path="maps/popular" element={<MapsPage sort="popular" />} />
          <Route path="maps/:id" element={<MapDetail />} />

          {/* Mods */}
          <Route path="mods" element={<ModsPage sort="newest" />} />
          <Route path="mods/newest" element={<ModsPage sort="newest" />} />
          <Route path="mods/oldest" element={<ModsPage sort="oldest" />} />
          <Route path="mods/downloaded" element={<ModsPage sort="downloaded" />} />
          <Route path="mods/popular" element={<ModsPage sort="popular" />} />
          <Route path="mods/:id" element={<ModDetail />} />

          {/* Search */}
          <Route path="search" element={<SearchPage />} />

          {/* Auth */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          {/* Profiles */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="u/:username" element={<UserProfilePage />} />

          {/* About */}
          <Route path="about" element={<AboutPage />} />

          {/* Admin */}
          <Route path="admin" element={<AdminPage />} />

          {/* Legacy OG tag redirect routes — redirect to SPA equivalents */}
          <Route path="api_v2/mapview" element={<MapDetail legacyQuery="mapId" />} />
          <Route path="api_v2/modview" element={<ModDetail legacyQuery="modId" />} />
          <Route path="api_v2/profile/:username" element={<UserProfilePage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
