import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'
import { formatDateShort } from '../utils/dateFormat'

const safeDate = (val) => val ? formatDateShort(val) : '-'

const GST_PERCENT_OPTIONS = [
  { label: '0%', value: '0' },
  { label: '5%', value: '5' },
  { label: '12%', value: '12' },
  { label: '18%', value: '18' },
  { label: '28%', value: '28' },
]

const RECURRING_OPTIONS = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']

const emptyPaymentForm = {
  gstType: '',
  gstPercent: '',
  recurring: '',
  recurringType: '',
  totalCost: '',
  paymentDate: '',
  paymentAmount: '',
  paymentNote: '',
  pendingAmount: '',
}

export default function AccountClientsPage() {
  const { clients, payments, profile, updatePayment, addToast } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingClient, setViewingClient] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ ...emptyPaymentForm })
  const [saving, setSaving] = useState(false)

  const role = String(profile?.systemRole || '').trim().toLowerCase()
  const canEditPayment = role === 'admin' || role === 'accountant'

  const query = searchQuery.toLowerCase()
  const filteredClients = clients.filter(c => {
    const isActive = String(c['Is Active'] || c['isActive'] || c['is_active'] || '').toLowerCase() === 'yes'
    if (!isActive) return false
    return (
      String(c['Project Name'] || '').toLowerCase().includes(query) ||
      String(c['Client Name'] || c['Company Name'] || '').toLowerCase().includes(query) ||
      String(c['Contact Email'] || '').toLowerCase().includes(query) ||
      String(c['Client ID'] || '').toLowerCase().includes(query) ||
      String(c['Industry'] || '').toLowerCase().includes(query)
    )
  })

  const getPayment = (clientId) => payments.find(p => String(p['CLIENT ID']).trim() === String(clientId).trim())

  const openPaymentForm = () => {
    if (!viewingClient) return
    const existing = getPayment(viewingClient['Client ID'])
    setPaymentForm({
      gstType: existing?.['GST/NON GST'] || '',
      gstPercent: existing?.['GST (%)'] || '',
      recurring: existing?.['RECURRING'] || '',
      recurringType: existing?.['RECURRING TYPE'] || '',
      totalCost: existing?.['TOTAL COST'] || '',
      paymentDate: existing?.['PAYMENT DATE'] || '',
      paymentAmount: existing?.['PAYMENT AMOUNT'] || '',
      paymentNote: existing?.['PAYMENT NOTE'] || '',
      pendingAmount: existing?.['PENDING AMOUNT'] || '',
    })
    setShowPaymentForm(true)
  }

  const calcTotalWithGst = () => {
    const cost = parseFloat(paymentForm.totalCost) || 0
    const pct = paymentForm.gstType === 'GST' ? (parseFloat(paymentForm.gstPercent) || 0) : 0
    return cost + (cost * pct / 100)
  }

  const handleSavePayment = async () => {
    if (!viewingClient) return
    setSaving(true)
    const success = await updatePayment({
      action: 'update_payment',
      clientId: viewingClient['Client ID'],
      'GST/NON GST': paymentForm.gstType,
      'GST (%)': paymentForm.gstType === 'GST' ? paymentForm.gstPercent : '',
      'RECURRING': paymentForm.recurring,
      'RECURRING TYPE': paymentForm.recurring === 'Yes' ? paymentForm.recurringType : '',
      'TOTAL COST': paymentForm.totalCost,
      'PAYMENT DATE': paymentForm.paymentDate,
      'PAYMENT AMOUNT': paymentForm.paymentAmount,
      'PAYMENT NOTE': paymentForm.paymentNote,
      'PENDING AMOUNT': paymentForm.pendingAmount,
    })
    setSaving(false)
    if (success) {
      addToast?.('Payment details saved', 'success')
      setShowPaymentForm(false)
    } else {
      addToast?.('Failed to save payment details', 'error')
    }
  }

  const viewingPayment = viewingClient ? getPayment(viewingClient['Client ID']) : null

  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <Sidebar />
      <main className="page-main">
        <TopNav title="Account Clients" showSearch={false} />
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 pb-6 animate-fade-in-up">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
            <div>
              <h2 className="text-[28px] font-bold text-[#1E1B2E] mb-1 leading-tight">Account Clients</h2>
              <p className="text-[14px] text-[#6B7280] m-0">Active clients overview for accounting.</p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-4 py-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px] text-[#9CA3AF]">analytics</span>
                <span className="text-[13px] font-bold text-[#702c91]">{filteredClients.length}</span>
                <span className="text-[13px] text-[#6B7280]">active</span>
              </div>

              <div className="relative flex-1 md:flex-none">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-[300px] h-[42px] pl-10 pr-4 rounded-full border border-[#E5E7EB] bg-white text-[13px] outline-none focus:border-[#702c91] focus:ring-1 focus:ring-[#702c91] transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="block lg:table w-full text-left border-collapse min-w-full lg:min-w-[900px]">
                <thead className="hidden lg:table-header-group">
                  <tr className="bg-[#F3F4F6] border-b border-[#E5E7EB]">
                    <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Client ID</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Project Name</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Client Name</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Industry</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Services</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Start Date</th>
                  </tr>
                </thead>
                <tbody className="block lg:table-row-group divide-y lg:divide-none divide-[#E5E7EB]">
                  {filteredClients.map((client, idx) => (
                    <tr
                      key={client['Client ID'] || idx}
                      onClick={() => { setViewingClient(client); setShowPaymentForm(false) }}
                      className={`block lg:table-row bg-white border-b border-[#E5E7EB] lg:hover:bg-white lg:hover:scale-[1.01] lg:hover:shadow-[0_8px_24px_rgba(91,33,182,0.08)] transition-all duration-200 relative cursor-pointer ${idx === filteredClients.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="block lg:table-cell py-3 px-4 lg:py-4 lg:px-6 text-[13px] font-bold text-[#1E1B2E]">
                        <span className="lg:hidden text-[10px] uppercase text-[#6B7280] mr-2">ID:</span>
                        {client['Client ID']}
                      </td>
                      <td className="block lg:table-cell py-2 px-4 lg:py-4 lg:px-6 text-[13px] font-bold text-[#702c91]">
                        <span className="lg:hidden text-[10px] uppercase text-[#6B7280] mr-2">Project:</span>
                        {client['Project Name'] || '-'}
                      </td>
                      <td className="block lg:table-cell py-2 px-4 lg:py-4 lg:px-6 text-[13px] text-[#4B5563]">
                        <span className="lg:hidden text-[10px] uppercase text-[#6B7280] mr-2">Client:</span>
                        {client['Client Name'] || client['Company Name'] || '-'}
                      </td>
                      <td className="block lg:table-cell py-2 px-4 lg:py-4 lg:px-6 text-[13px] text-[#6B7280]">
                        <span className="lg:hidden text-[10px] uppercase text-[#6B7280] mr-2">Industry:</span>
                        {client['Industry'] || '-'}
                      </td>
                      <td className="block lg:table-cell py-2 px-4 lg:py-4 lg:px-6 text-[13px] text-[#6B7280]">
                        <span className="lg:hidden text-[10px] uppercase text-[#6B7280] mr-2">Services:</span>
                        {client['Services'] ? (
                          <div className="flex flex-wrap gap-1">
                            {String(client['Services']).split(',').slice(0, 2).map((s, i) => (
                              <span key={i} className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {s.trim()}
                              </span>
                            ))}
                            {String(client['Services']).split(',').length > 2 && (
                              <span className="text-[10px] text-gray-400">+{String(client['Services']).split(',').length - 2}</span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="block lg:table-cell py-2 px-4 pb-4 lg:py-4 lg:px-6 text-[13px] text-[#4B5563]">
                        <span className="lg:hidden text-[10px] uppercase text-[#6B7280] mr-2">Start:</span>
                        {safeDate(client['Project start Date'])}
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr className="block lg:table-row">
                      <td colSpan="6" className="block lg:table-cell py-12 text-center text-[#6B7280]">
                        <div className="flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">search_off</span>
                          <p className="text-[14px] font-medium m-0">No active clients found.</p>
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

      {/* Client Info Modal */}
      {viewingClient && !showPaymentForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[460px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
              <h2 className="text-[18px] font-bold text-[#702c91] flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-[20px]">business</span>
                {viewingClient['Project Name'] || 'Client'}
              </h2>
              <button
                onClick={() => setViewingClient(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client Name</label>
                  <p className="text-[16px] font-bold text-[#1E1B2E] m-0">{viewingClient['Client Name'] || viewingClient['Company Name'] || '-'}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Industry</label>
                  <p className="text-[14px] text-[#4B5563] m-0">{viewingClient['Industry'] || '-'}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Services</label>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingClient['Services'] ? String(viewingClient['Services']).split(',').map((s, i) => (
                      <span key={i} className="bg-purple-50 text-purple-700 border border-purple-100 text-[11px] font-bold px-2.5 py-1 rounded-full">{s.trim()}</span>
                    )) : <p className="text-[14px] text-gray-400 m-0">-</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Project Start Date</label>
                  <p className="text-[14px] text-[#4B5563] m-0 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#9CA3AF]">calendar_today</span>
                    {safeDate(viewingClient['Project start Date'])}
                  </p>
                </div>
                {(viewingClient['Project Completion Date'] || viewingClient['Project Completion date']) && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Completion Date</label>
                    <p className="text-[14px] text-[#EF4444] m-0 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">event_busy</span>
                      {safeDate(viewingClient['Project Completion Date'] || viewingClient['Project Completion date'])}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Email</label>
                  <p className="text-[14px] text-[#4B5563] m-0">{viewingClient['Contact Email'] || '-'}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                  <p className="text-[14px] text-[#4B5563] m-0">{viewingClient['Phone'] || '-'}</p>
                </div>

                {/* Payment Summary */}
                {viewingPayment && (
                  <div className="border-t border-gray-200 pt-4 mt-1">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Details</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 m-0 mb-1">GST / Non-GST</p>
                        <p className="text-[13px] font-bold text-[#1E1B2E] m-0">{viewingPayment['GST/NON GST'] || '-'}</p>
                      </div>
                      {viewingPayment['GST/NON GST'] === 'GST' && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-400 m-0 mb-1">GST %</p>
                          <p className="text-[13px] font-bold text-[#1E1B2E] m-0">{viewingPayment['GST (%)'] || '-'}%</p>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 m-0 mb-1">Recurring</p>
                        <p className="text-[13px] font-bold text-[#1E1B2E] m-0">{viewingPayment['RECURRING'] || '-'}</p>
                      </div>
                      {viewingPayment['RECURRING'] === 'Yes' && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-400 m-0 mb-1">Recurring Type</p>
                          <p className="text-[13px] font-bold text-[#1E1B2E] m-0">{viewingPayment['RECURRING TYPE'] || '-'}</p>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 m-0 mb-1">Total Cost</p>
                        <p className="text-[13px] font-bold text-[#702c91] m-0">{viewingPayment['TOTAL COST'] ? `₹${viewingPayment['TOTAL COST']}` : '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 m-0 mb-1">Payment Date</p>
                        <p className="text-[13px] font-bold text-[#1E1B2E] m-0">{viewingPayment['PAYMENT DATE'] ? formatDateShort(viewingPayment['PAYMENT DATE']) : '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 m-0 mb-1">Payment Amount</p>
                        <p className="text-[13px] font-bold text-[#16a34a] m-0">{viewingPayment['PAYMENT AMOUNT'] ? `₹${viewingPayment['PAYMENT AMOUNT']}` : '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 m-0 mb-1">Pending Amount</p>
                        <p className="text-[13px] font-bold text-[#ef4444] m-0">{viewingPayment['PENDING AMOUNT'] ? `₹${viewingPayment['PENDING AMOUNT']}` : '-'}</p>
                      </div>
                    </div>
                    {viewingPayment['PAYMENT NOTE'] && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-400 m-0 mb-1">Payment Note</p>
                        <p className="text-[13px] text-[#1E1B2E] m-0">{viewingPayment['PAYMENT NOTE']}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {canEditPayment && (
              <div className="border-t border-gray-200 px-6 py-4 shrink-0">
                <button
                  onClick={openPaymentForm}
                  className="w-full h-[42px] rounded-xl bg-[#702c91] hover:bg-[#5c2280] text-white text-[13px] font-bold cursor-pointer transition-all flex items-center justify-center gap-2 border-none"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  {viewingPayment ? 'Edit Payment Details' : 'Add Payment Details'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Details Form Modal */}
      {viewingClient && showPaymentForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[500px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
              <h2 className="text-[18px] font-bold text-[#702c91] flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-[20px]">payments</span>
                Payment Details — {viewingClient['Client ID']}
              </h2>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
              <div className="flex flex-col gap-5">
                {/* GST / Non-GST */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">GST / Non-GST</label>
                  <div className="flex gap-3">
                    {['GST', 'Non-GST'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPaymentForm(f => ({ ...f, gstType: f.gstType === opt ? '' : opt, gstPercent: f.gstType === opt ? '' : f.gstPercent }))}
                        className={`flex-1 h-[40px] rounded-xl text-[13px] font-bold cursor-pointer transition-all border ${paymentForm.gstType === opt ? 'bg-[#702c91] text-white border-[#702c91]' : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#702c91]'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GST % */}
                {paymentForm.gstType === 'GST' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">GST (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={paymentForm.gstPercent}
                      onChange={(e) => setPaymentForm(f => ({ ...f, gstPercent: e.target.value }))}
                      placeholder="Enter GST %"
                      className="w-full h-[40px] px-4 rounded-xl border border-[#E5E7EB] bg-white text-[13px] outline-none focus:border-[#702c91] focus:ring-1 focus:ring-[#702c91] transition-all"
                    />
                  </div>
                )}

                {/* Recurring */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recurring</label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPaymentForm(f => ({ ...f, recurring: f.recurring === opt ? '' : opt, recurringType: f.recurring === opt ? '' : f.recurringType }))}
                        className={`flex-1 h-[40px] rounded-xl text-[13px] font-bold cursor-pointer transition-all border ${paymentForm.recurring === opt ? 'bg-[#702c91] text-white border-[#702c91]' : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#702c91]'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recurring Type */}
                {paymentForm.recurring === 'Yes' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recurring Type</label>
                    <div className="flex gap-2 flex-wrap">
                      {RECURRING_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPaymentForm(f => ({ ...f, recurringType: f.recurringType === opt ? '' : opt }))}
                          className={`h-[36px] px-4 rounded-lg text-[12px] font-bold cursor-pointer transition-all border ${paymentForm.recurringType === opt ? 'bg-[#702c91] text-white border-[#702c91]' : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#702c91]'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Cost */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Project Cost (₹)</label>
                  <input
                    type="number"
                    value={paymentForm.totalCost}
                    onChange={(e) => setPaymentForm(f => ({ ...f, totalCost: e.target.value }))}
                    placeholder="Enter project cost"
                    className="w-full h-[40px] px-4 rounded-xl border border-[#E5E7EB] bg-white text-[13px] outline-none focus:border-[#702c91] focus:ring-1 focus:ring-[#702c91] transition-all"
                  />
                  {paymentForm.gstType === 'GST' && paymentForm.gstPercent && paymentForm.totalCost && (
                    <div className="mt-2 bg-purple-50 border border-purple-100 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-[12px] text-[#702c91] font-bold">Total with GST</span>
                      <span className="text-[15px] font-bold text-[#702c91]">₹{calcTotalWithGst().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 shrink-0 flex gap-3">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 h-[42px] rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] text-[13px] font-bold cursor-pointer hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                disabled={saving}
                className="flex-1 h-[42px] rounded-xl bg-[#702c91] hover:bg-[#5c2280] text-white text-[13px] font-bold cursor-pointer transition-all border-none disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Payment Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
