import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e6edf3]">About Dewrito Share</h1>
        <p className="text-[#8b949e] mt-1 text-sm">The ElDewrito community fileshare</p>
      </div>

      <div className="card p-6 space-y-4">
        <p className="text-[#cdd9e5] text-sm leading-relaxed">
          Dewrito Share is a community-run fileshare for{' '}
          <a href="https://github.com/ElDewrito/ElDewrito" target="_blank" rel="noopener noreferrer">
            ElDewrito
          </a>
          , a fan-made Halo Online mod. Share your custom maps and mods with the community.
        </p>
        <p className="text-[#cdd9e5] text-sm leading-relaxed">
          This project is a spiritual successor to Dewrito Hub. Powered by zgaf.io.
        </p>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider">Links</h2>
        <div className="flex flex-col gap-2">
          <a href="https://youtu.be/_Gr9cL9EZDY" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Forge Tutorial Video
          </a>
          <a href="https://status.zgaf.io/status/ed-service" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Service Status
          </a>
          <a href="https://discord.gg/CPc7Gf7TPf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.11 18.1.127 18.115a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Discord Server
          </a>
        </div>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider">Content Types</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-[#cdd9e5]">Maps (.sandbox)</dt>
            <dd className="text-[#8b949e] mt-0.5">Custom Forge maps with their game variant files</dd>
          </div>
          <div>
            <dt className="font-medium text-[#cdd9e5]">Mods (.pak)</dt>
            <dd className="text-[#8b949e] mt-0.5">Game modifications — vehicles, weapons, armor, UI, and more</dd>
          </div>
        </dl>
      </div>

      <p className="text-center text-xs text-[#484f58]">
        Dewrito Share · <Link to="/" className="text-[#8b949e] hover:text-[#cdd9e5]">fileshare.zgaf.io</Link>
      </p>
    </div>
  )
}
