import { useApp } from '../context/AppContext'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

/**
 * Shared layout shell used by all protected pages.
 * Dynamically adjusts the left margin of the main area based on sidebar state.
 */
export default function MainLayout({ children, title, badgeCount, showSearch = true, noPadding = false }) {
  const { isSidebarOpen } = useApp()

  // Collapsed sidebar = 72px wide + 12px left offset = 84px
  // Expanded sidebar = 240px wide + 12px left offset = 252px
  // Add 12px gap between sidebar right edge and main content
  const mainMarginLeft = isSidebarOpen ? 252 + 8 : 84 + 8

  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F8; border-radius: 10px; }
      `}</style>

      <Sidebar />

      <main
        className="flex-1 flex flex-col h-screen overflow-hidden"
        style={{
          marginLeft: mainMarginLeft,
          transition: 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <TopNav title={title} badgeCount={badgeCount} showSearch={showSearch} />
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'px-3 py-5 pb-6'} animate-fade-in-up`}>
          {children}
        </div>
      </main>
    </div>
  )
}
