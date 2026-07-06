import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp, mqttClient } from '../context/AppContext'

const AVAILABLE_SERVICES = [
  "Business Growth Consulting",
  "AI SEO & Lead Generation",
  "D2C Development / Marketing",
  "Ecommerce Development",
  "Website Development",
  "Digital Marketing & Brand Awareness",
  "Branding & Identity Management",
  "Mobile Apps and Software Development",
  "Marketing Automation & Funnel Development",
  "Films, Videos and UGC content creation",
  "Software and SAAS development",
  "Ai Automation and Business Growth",
  "360 Project"
]

export default function ClientsPage() {
  const { clients, fetchClients, profile, addToast } = useApp()
  const [isUpdating, setIsUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingClient, setEditingClient] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientForm, setClientForm] = useState({
    projectName: '',
    clientName: '',
    emails: [''],
    phones: [''],
    industry: '',
    services: []
  })

  const openEditModal = (client) => {
    if (profile?.systemRole === 'Employee') return
    const emails = client['Contact Email'] ? String(client['Contact Email']).split(',').map(e => e.trim()) : ['']
    const phones = client['Phone'] ? String(client['Phone']).split(',').map(p => p.trim()) : ['']
    const servicesStr = client['Services'] || client['services'] || ''
    const servicesList = servicesStr ? String(servicesStr).split(',').map(s => s.trim()) : []
    setEditingClient(client)
    setClientForm({
      projectName: client['Project Name'] || '',
      clientName: client['Client Name'] || client['Company Name'] || '',
      emails: emails.length > 0 && emails[0] ? emails : [''],
      phones: phones.length > 0 && phones[0] ? phones : [''],
      industry: client['Industry'] || '',
      services: servicesList
    })
  }

  const handleUpdateClient = async (e) => {
    e.preventDefault()
    if (!editingClient) return

    setIsSubmitting(true)
    try {
      const payload = {
        action: 'update_client',
        clientId: editingClient['Client ID'],
        projectName: clientForm.projectName.trim(),
        clientName: clientForm.clientName.trim(),
        contactEmail: clientForm.emails.filter(e => e.trim() !== '').join(', '),
        phone: clientForm.phones.filter(p => p.trim() !== '').join(', '),
        industry: clientForm.industry.trim(),
        services: clientForm.services.join(', '),
        userEmail: profile?.email
      }
      const res = await fetch('https://script.google.com/macros/s/AKfycbw9z0VML0zBtMAa4VHmVB9E-RjmCdHpashF-V28cThhx-rbw8T_sbbrB4sajSJw2nSf/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.ok) {
        await fetchClients()
        setEditingClient(null)
        if (mqttClient && mqttClient.connected) {
          setTimeout(() => {
            mqttClient.publish('dd_task_engine_v1/sync', JSON.stringify({ action: 'sync' }))
          }, 1000)
        }
      } else {
        addToast('Failed to update client: ' + (data.error || 'Unknown error'), 'error')
      }
    } catch (err) {
      addToast('Error updating client: ' + err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (client) => {
    const isActive = client['Is Active'] || client['isActive'] || client['is_active'] || client.isActive
    const newStatus = String(isActive).toLowerCase() === 'yes' ? 'No' : 'Yes'

    setIsUpdating(true)
    try {
      const res = await fetch('https://script.google.com/macros/s/AKfycbw9z0VML0zBtMAa4VHmVB9E-RjmCdHpashF-V28cThhx-rbw8T_sbbrB4sajSJw2nSf/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_client',
          clientId: client['Client ID'],
          isActive: newStatus,
          userEmail: profile?.email
        })
      })
      const data = await res.json()
      if (data.ok) {
        await fetchClients()
        if (mqttClient && mqttClient.connected) {
          setTimeout(() => {
            mqttClient.publish('dd_task_engine_v1/sync', JSON.stringify({ action: 'sync' }))
          }, 1000)
        }
      } else {
        addToast('Failed to update client status: ' + (data.error || 'Unknown error'), 'error')
      }
    } catch (err) {
      addToast('Error updating client status: ' + err.message, 'error')
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
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col h-[100vh] overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Clients" showSearch={false} />
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 pb-6 animate-fade-in-up">
          
          {/* Page Header Area */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-[28px] font-bold text-[#1E1B2E] mb-1 leading-tight">Clients</h2>
              <p className="text-[14px] text-[#6B7280] m-0">Manage client details and active status.</p>
            </div>
            
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Search clients..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[300px] h-[42px] pl-10 pr-4 rounded-full border border-[#E5E7EB] bg-white text-[13px] outline-none focus:border-[#702c91] focus:ring-1 focus:ring-[#702c91] transition-all shadow-sm"
              />
            </div>
          </div>

            {/* Table Container */}
            <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#F3F4F6] border-b border-[#E5E7EB]">
                      <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Client ID</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Project Name</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Client Name</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Client Email(s)</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Phone</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Industry</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-center">Active Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client, idx) => {
                      const isActiveVal = client['Is Active'] || client['isActive'] || client['is_active'] || client.isActive
                      const isActive = String(isActiveVal).toLowerCase() === 'yes' || isActiveVal === true

                      return (
                        <tr 
                          key={client['Client ID'] || idx} 
                          className={`border-b border-[#E5E7EB] transition-all duration-200 relative ${idx === filteredClients.length - 1 ? 'border-b-0' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={e => { 
                            e.currentTarget.style.background = 'white'; 
                            e.currentTarget.style.transform = 'scale(1.01)'; 
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(91,33,182,0.08)';
                            e.currentTarget.style.zIndex = 10;
                          }}
                          onMouseLeave={e => { 
                            e.currentTarget.style.background = 'transparent'; 
                            e.currentTarget.style.transform = 'scale(1)'; 
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.zIndex = 1;
                          }}
                        >
                          {/* Client ID */}
                          <td className="py-4 px-6 text-[13px] font-bold text-[#1E1B2E]">
                            {client['Client ID']}
                          </td>
                          {/* Project Name */}
                          <td
                            className="py-4 px-6 text-[13px] font-bold text-[#702c91] cursor-pointer hover:underline"
                            onClick={() => {
                              if (profile?.systemRole !== 'Employee') openEditModal(client)
                            }}
                          >
                            {client['Project Name'] || client['Client Name'] || client['Company Name'] || '-'}
                          </td>
                          {/* Client Name */}
                          <td className="py-4 px-6 text-[13px] text-[#4B5563]">
                            {client['Project Name'] ? (client['Client Name'] || client['Company Name'] || client['Contact Person'] || '-') : (client['Contact Person'] || '-')}
                          </td>
                          {/* Client Email(s) */}
                          <td className="py-4 px-6 text-[13px] text-[#6B7280]">
                            {client['Contact Email'] || client['Email'] || '-'}
                          </td>
                          {/* Phone */}
                          <td className="py-4 px-6 text-[13px] text-[#6B7280]">
                            {client['Phone'] || '-'}
                          </td>
                          {/* Industry */}
                          <td className="py-4 px-6 text-[13px] text-[#6B7280]">
                            {client['Industry'] || '-'}
                          </td>
                          {/* Active Status */}
                          <td className="py-4 px-6 flex flex-col items-center justify-center gap-1">
                            <div className={`relative inline-block w-10 h-5 align-middle select-none transition duration-200 ease-in mt-1 ${(isUpdating || profile?.systemRole === 'Employee') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => { if (!isUpdating && profile?.systemRole !== 'Employee') handleToggleStatus(client) }}>
                              <div className={`absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none transition-transform duration-300 ease-in-out z-10 ${isActive ? 'translate-x-5 border-[#10B981]' : 'translate-x-0 border-gray-300'}`}/>
                              <div className={`block overflow-hidden h-5 rounded-full transition-colors duration-300 ease-in-out ${isActive ? 'bg-[#10B981]' : 'bg-gray-300'}`}/>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-[#10B981]' : 'text-gray-400'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredClients.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-[#6B7280]">
                          <div className="flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">search_off</span>
                            <p className="text-[14px] font-medium m-0">No clients found matching your criteria.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </main>

      {/* Edit Client Modal */}
      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateClient}
            className="bg-white w-full max-w-[480px] rounded-2xl shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in"
          >
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <h2 className="text-[18px] font-bold text-[#702c91] flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-[20px]">edit_square</span>
                Update Client Profile
              </h2>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Project Name *</label>
              <input
                type="text"
                required
                value={clientForm.projectName}
                onChange={e => setClientForm({ ...clientForm, projectName: e.target.value })}
                className="w-full bg-[#f4f3f7] border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-800 focus:border-[#702c91] focus:bg-white outline-none transition-colors shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Client Name</label>
              <input
                type="text"
                value={clientForm.clientName}
                onChange={e => setClientForm({ ...clientForm, clientName: e.target.value })}
                className="w-full bg-[#f4f3f7] border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-800 focus:border-[#702c91] focus:bg-white outline-none transition-colors shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Client Email(s)</label>
                <button
                  type="button"
                  onClick={() => setClientForm({ ...clientForm, emails: [...clientForm.emails, ''] })}
                  className="text-[#702c91] hover:bg-purple-50 rounded-full p-0.5 flex items-center transition-colors bg-transparent border-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
              <div className="space-y-2">
                {clientForm.emails.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        const newEmails = [...clientForm.emails]
                        newEmails[idx] = e.target.value
                        setClientForm({ ...clientForm, emails: newEmails })
                      }}
                      className="w-full bg-[#f4f3f7] border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-800 focus:border-[#702c91] focus:bg-white outline-none transition-colors shadow-sm"
                    />
                    {clientForm.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newEmails = clientForm.emails.filter((_, i) => i !== idx)
                          setClientForm({ ...clientForm, emails: newEmails })
                        }}
                        className="text-red-500 hover:bg-red-50 rounded-md px-2 flex items-center transition-colors bg-transparent border-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">remove</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Client Phone(s)</label>
                <button
                  type="button"
                  onClick={() => setClientForm({ ...clientForm, phones: [...clientForm.phones, ''] })}
                  className="text-[#702c91] hover:bg-purple-50 rounded-full p-0.5 flex items-center transition-colors bg-transparent border-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
              <div className="space-y-2">
                {clientForm.phones.map((phone, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={phone}
                      onChange={e => {
                        const newPhones = [...clientForm.phones]
                        newPhones[idx] = e.target.value
                        setClientForm({ ...clientForm, phones: newPhones })
                      }}
                      className="w-full bg-[#f4f3f7] border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-800 focus:border-[#702c91] focus:bg-white outline-none transition-colors shadow-sm"
                    />
                    {clientForm.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPhones = clientForm.phones.filter((_, i) => i !== idx)
                          setClientForm({ ...clientForm, phones: newPhones })
                        }}
                        className="text-red-500 hover:bg-red-50 rounded-md px-2 flex items-center transition-colors bg-transparent border-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">remove</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Industry</label>
              <input
                type="text"
                value={clientForm.industry}
                onChange={e => setClientForm({ ...clientForm, industry: e.target.value })}
                className="w-full bg-[#f4f3f7] border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-800 focus:border-[#702c91] focus:bg-white outline-none transition-colors shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Services</label>
              <div className="bg-[#f4f3f7] border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-700 max-h-[160px] overflow-y-auto custom-scrollbar flex flex-col gap-3 shadow-inner">
                {AVAILABLE_SERVICES.map(service => (
                  <label key={service} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={clientForm.services.includes(service)}
                      onChange={e => {
                        const isChecked = e.target.checked
                        setClientForm(prev => ({
                          ...prev,
                          services: isChecked
                            ? [...prev.services, service]
                            : prev.services.filter(s => s !== service)
                        }))
                      }}
                      className="w-4 h-4 cursor-pointer accent-[#702c91]"
                    />
                    <span className="text-[13px] group-hover:text-[#702c91] transition-colors">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 mt-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-[14px] text-gray-500 hover:text-gray-700 font-medium transition-colors bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg btn-gradient border-none font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">save</span>
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
