import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import UploadModal from './UploadModal'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uploadModal, setUploadModal] = useState(null) // 'map' | 'mod' | 'prefab' | null

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        onUpload={(type) => setUploadModal(type)}
      />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
      {uploadModal && (
        <UploadModal type={uploadModal} onClose={() => setUploadModal(null)} />
      )}
    </div>
  )
}
