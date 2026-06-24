import React, { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'

export default function ClientsPage() {
  const { clients, fetchClients } = useApp()
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleToggleStatus = async (client) => {
    const isActive = client['Is Active'] || client['isActive'] || client['is_active'] || client.isActive
    const newStatus = String(isActive).toLowerCase() === 'yes' ? 'No' : 'Yes'

    setIsUpdating(true)
    try {
      const res = await fetch('https://script.google.com/macros/s/AKfycbyNmm8iULiSCRm-6I8CZvHls2WCcL3GEfMGnp8TLjI7qCaRoa5s0wOU0EK9e2pl3ro/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_client',
          clientId: client['Client ID'],
          isActive: newStatus
        })
      })
      const data = await res.json()
      if (data.ok) {
        await fetchClients()
      } else {
        alert('Failed to update client status: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Error updating client status: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const query = searchQuery.toLowerCase()
  const filteredClients = clients.filter(c => {
    return (
      String(c['Project Name'] || '').toLowerCase().includes(query) ||
      String(c['Client Name'] || c['Company Name'] || '').toLowerCase().includes(query) ||
      String(c['Contact Email'] || '').toLowerCase().includes(query) ||
      String(c['Client ID'] || '').toLowerCase().includes(query)
    )
  })

  return (
    <div className="bg-surface text-on-surface flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-[240px] flex-1 flex flex-col h-screen overflow-hidden">
        <TopNav />
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1450px] mx-auto w-full py-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 
                  className="mb-1 text-primary"
                  style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: '28px' }}
                >
                  Clients Database
                </h2>
                <p className="text-secondary text-body-sm">Manage client details and active status.</p>
              </div>
              
              <div className="relative max-w-xs w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-full pl-10 pr-4 py-2.5 text-body-sm focus:border-primary focus:ring-0 outline-none"
                />
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="py-3 px-4 text-label-sm font-label-sm text-secondary uppercase tracking-wider">Client ID</th>
                      <th className="py-3 px-4 text-label-sm font-label-sm text-secondary uppercase tracking-wider">Project Name</th>
                      <th className="py-3 px-4 text-label-sm font-label-sm text-secondary uppercase tracking-wider">Client Name</th>
                      <th className="py-3 px-4 text-label-sm font-label-sm text-secondary uppercase tracking-wider">Email(s)</th>
                      <th className="py-3 px-4 text-label-sm font-label-sm text-secondary uppercase tracking-wider">Phone</th>
                      <th className="py-3 px-4 text-label-sm font-label-sm text-secondary uppercase tracking-wider">Industry</th>
                      <th className="py-3 px-4 text-label-sm font-label-sm text-secondary uppercase tracking-wider text-center">Active Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {filteredClients.map((client, idx) => {
                      const isActiveVal = client['Is Active'] || client['isActive'] || client['is_active'] || client.isActive
                      const isActive = String(isActiveVal).toLowerCase() === 'yes' || isActiveVal === true

                      return (
                        <tr key={client['Client ID'] || idx} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-3 px-4 text-body-sm font-bold text-secondary whitespace-nowrap">
                            {client['Client ID']}
                          </td>
                          <td className="py-3 px-4 text-body-sm font-bold text-primary">
                            {client['Project Name'] || client['Client Name'] || client['Company Name'] || '-'}
                          </td>
                          <td className="py-3 px-4 text-body-sm text-on-surface">
                            {client['Project Name'] ? (client['Client Name'] || client['Company Name'] || client['Contact Person'] || '-') : (client['Contact Person'] || '-')}
                          </td>
                          <td className="py-3 px-4 text-body-sm text-secondary">
                            {client['Contact Email'] || client['Email'] || '-'}
                          </td>
                          <td className="py-3 px-4 text-body-sm text-secondary">
                            {client['Phone'] || '-'}
                          </td>
                          <td className="py-3 px-4 text-body-sm text-secondary">
                            {client['Industry'] || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(client)}
                              disabled={isUpdating}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-[#25d366]' : 'bg-outline-variant'} ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              role="switch"
                              aria-checked={isActive}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                            </button>
                            <span className={`block text-[10px] font-bold mt-1 uppercase tracking-wider ${isActive ? 'text-[#25d366]' : 'text-secondary'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredClients.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-secondary">
                          <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">search_off</span>
                          <p>No clients found matching your search.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-4 border-t border-outline-variant bg-surface-container-lowest flex-shrink-0">
          <div className="flex justify-between items-center px-8 w-full">
            <p className="font-label-sm text-label-sm text-secondary">
              Dreamsdesk
            </p>
            <div className="flex gap-6">
              <a href="#" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
                Support
              </a>
              <a href="#" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
