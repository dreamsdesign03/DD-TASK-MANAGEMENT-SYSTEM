import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'
import { processMessagesList, renderMessageText, renderAvatar } from './ChatPage'
/* â”€â”€â”€ Priority badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PriorityBadge({ priority }) {
  const map = {
    Urgent: 'bg-[#E74C3C]/10 text-[#E74C3C] border border-[#E74C3C]/20',
    High: 'bg-amber-100 text-amber-700 border border-amber-200',
    Medium: 'bg-blue-100 text-blue-700 border border-blue-200',
    Low: 'bg-gray-100 text-gray-600 border border-gray-200',
  }
  return (
    <span className={`${map[priority] || map.Low} px-3 py-1.5 rounded-full text-label-sm font-label-sm font-bold`}>
      {priority}
    </span>
  )
}

/* â”€â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StatusBadge({ status }) {
  const map = {
    Blocked: 'bg-urgent-red text-white',
    'In Progress': 'bg-amber-500 text-white',
    Review: 'bg-blue-500 text-white',
    Done: 'bg-success-green text-white',
    Pending: 'bg-gray-400 text-white',
  }
  return (
    <span className={`${map[status] || 'bg-gray-400 text-white'} px-3 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-1`}>
      <span className="material-symbols-outlined text-[16px]">
        {status === 'Blocked' ? 'block' : status === 'Done' ? 'check_circle' : 'radio_button_checked'}
      </span>
      {status}
    </span>
  )
}



function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'Urgent':
      return {
        label: 'Critical',
        badgeClass: 'bg-urgent-red text-white',
        iconClass: 'bg-urgent-red/10 text-urgent-red',
        textClass: 'text-urgent-red',
        desc: 'Requires immediate attention to resolve blocking issues for client delivery.',
      }
    case 'High':
      return {
        label: 'High',
        badgeClass: 'bg-amber-500 text-white',
        iconClass: 'bg-amber-500/10 text-amber-500',
        textClass: 'text-amber-500',
        desc: 'Should be resolved quickly to prevent potential project timeline delays.',
      }
    case 'Medium':
      return {
        label: 'Medium',
        badgeClass: 'bg-blue-500 text-white',
        iconClass: 'bg-blue-500/10 text-blue-500',
        textClass: 'text-blue-500',
        desc: 'Normal prioritization. To be completed within the scheduled milestone.',
      }
    case 'Low':
    default:
      return {
        label: 'Low',
        badgeClass: 'bg-gray-500 text-white',
        iconClass: 'bg-gray-500/10 text-gray-500',
        textClass: 'text-gray-500',
        desc: 'Low priority task. Can be worked on when higher items are cleared.',
      }
  }
}

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { tasks, updateTask, addTask, deleteTask, profile, employees, addSystemAndWebNotification, messagesByChatId, setMessagesByChatId, fetchMessages, markChatAsRead } = useApp()

  const task = tasks.find((t) => t.id === taskId) || tasks[0]

  useEffect(() => {
    fetchMessages()
  }, [taskId, fetchMessages])

  useEffect(() => {
    if (taskId) {
      markChatAsRead(taskId)
    }
  }, [taskId, messagesByChatId[taskId]?.length, markChatAsRead])

  const [reply, setReply] = useState('')
  const [replyAttachment, setReplyAttachment] = useState(null)
  const [isSendingReply, setIsSendingReply] = useState(false)
  const replyFileInputRef = useRef(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [localStatus, setLocalStatus] = useState(task.status)
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false)
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [attachmentToDelete, setAttachmentToDelete] = useState(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('')
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('')
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('Medium')
  const [isSubtaskInputActive, setIsSubtaskInputActive] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [subtaskToDelete, setSubtaskToDelete] = useState(null)
  const [infoModal, setInfoModal] = useState(null)

  const handleDueDateChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setNewSubtaskDueDate('');
      return;
    }
    // Check for Sunday
    const d = new Date(val + 'T00:00:00'); // Local time zone mapping
    if (d.getDay() === 0) { // 0 is Sunday
      alert('Sundays cannot be selected as a due date. Please select another day.');
      return;
    }
    setNewSubtaskDueDate(val);
  }

  const parseTimeStr = (str) => {
    if (!str || str === '0h 0m' || str === 'No' || typeof str !== 'string') return 0;
    let secs = 0;
    const hMatch = str.match(/(\d+)h/i);
    const mMatch = str.match(/(\d+)m/i);
    const sMatch = str.match(/(\d+)s/i);
    if (hMatch) secs += parseInt(hMatch[1]) * 3600;
    if (mMatch) secs += parseInt(mMatch[1]) * 60;
    if (sMatch) secs += parseInt(sMatch[1]);
    return secs;
  };

  const formatTimeStr = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const [isTracking, setIsTracking] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const timerRef = useRef(null);

  const handleToggleTimer = () => {
    if (isTracking) {
      clearInterval(timerRef.current);
      setIsTracking(false);
      const currentTotalSecs = parseTimeStr(task.timeTaken);
      const newTotalSecs = currentTotalSecs + sessionSecs;
      updateTask(task.id, { timeTaken: formatTimeStr(newTotalSecs) });
      setSessionSecs(0);
    } else {
      setIsTracking(true);
      timerRef.current = setInterval(() => {
        setSessionSecs(prev => prev + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (task) {
      setSelectedAssignees((task.assignedTo || '').split(',').map(s => s.trim()).filter(Boolean))
    }
  }, [task])

  const handleSaveAssignees = () => {
    updateTask(task.id, { assignedTo: selectedAssignees.join(', ') })
    setIsAssigneeModalOpen(false)
  }

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    let maxSubIdNum = 0;
    const existingSubtasks = tasks.filter(t => String(t.mainTaskId) === String(task.id) && (t.taskType === 'Sub Task' || t.taskType === 'Subtask'));
    existingSubtasks.forEach(st => {
      const match = String(st.id).match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSubIdNum) maxSubIdNum = num;
      }
    });
    const nextSubIdNum = maxSubIdNum + 1;
    const newStId = `${task.id}-${String(nextSubIdNum).padStart(2, '0')}`;

    let calculatedOverdue = 'No';
    if (newSubtaskDueDate) {
      const dueTime = new Date(newSubtaskDueDate).setHours(23, 59, 59, 999);
      if (dueTime < Date.now()) {
        calculatedOverdue = 'Yes';
      }
    }

    const assignedEmps = employees?.filter(e => (newSubtaskAssignee || '').split(',').map(s => s.trim()).includes(e.name)) || [];

    const newSt = {
      id: newStId,
      title: newSubtaskTitle.trim(),
      taskType: 'Sub Task',
      mainTaskId: task.id,
      client: task.client,
      project: task.project,
      department: task.department,
      status: 'Pending',
      assignedTo: newSubtaskAssignee,
      assignedBy: profile?.name || 'Mansi Shah',
      employeeId: assignedEmps.map(e => e.id).filter(Boolean).join(', '),
      assignedEmail: assignedEmps.map(e => e.email).filter(Boolean).join(', '),
      priority: newSubtaskPriority,
      dueDate: newSubtaskDueDate,
      daysOverdue: calculatedOverdue,
      description: { intro: '', bullets: [], outro: '' }
    }
    addTask(newSt)
    
    setNewSubtaskTitle('')
    setNewSubtaskAssignee('')
    setNewSubtaskPriority('Medium')
    setNewSubtaskDueDate('')
    setIsSubtaskInputActive(false)
  }

  const subtasks = tasks.filter(t => String(t.mainTaskId) === String(task.id) && (t.taskType === 'Sub Task' || t.taskType === 'Subtask'))

  const teamMembers = employees ? employees.map(e => e.name) : []
  const uniqueTeamMembers = [...new Set([...teamMembers, ...selectedAssignees].filter(Boolean))]
  const [isUploading, setIsUploading] = useState(false)
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const replyInputRef = useRef(null)
  const [mentionIndex, setMentionIndex] = useState(-1)
  const [mentionFilter, setMentionFilter] = useState('')
  const mentionDropdownRef = useRef(null)

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const newAttachments = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Convert to base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Send to Apps Script
        const url = 'https://script.google.com/macros/s/AKfycbwT8ub3UKW8-fj-S19hSOhRKp6F9SLfPgCvJTyUnpB-5rD6a0ElMDo7sQ9UhwLvRLsQ/exec'
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload_file',
            filename: file.name,
            mimeType: file.type,
            base64: base64Data.split(',')[1], // remove data:image/...;base64,
            projectName: task.client || 'General',
            department: task.department || 'COMMON'
          })
        })

        const data = await res.json()
        if (data.ok) {
          newAttachments.push({
            name: file.name,
            url: data.url || data.downloadUrl,
            downloadUrl: data.downloadUrl || '',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            type: file.type
          })
        } else {
          throw new Error(data.error || 'Upload failed')
        }
      }

      const updatedAttachments = [...(task.attachments || []), ...newAttachments]
      updateTask(task.id, { attachments: updatedAttachments })
      alert('Files uploaded successfully!')
    } catch (error) {
      console.error('File upload error:', error)
      alert('Failed to upload file: ' + error.message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Sync local status when task changes
  useEffect(() => {
    if (task) {
      setLocalStatus(task.status)
    }
  }, [task])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [task.comments])

  const handleReplyChange = (e) => {
    const val = e.target.value
    setReply(val)

    const selectionStart = e.target.selectionStart
    const beforeCursor = val.slice(0, selectionStart || val.length)
    const match = beforeCursor.match(/@([a-zA-Z0-9_\s]*)$/)

    if (match) {
      const atIdx = beforeCursor.lastIndexOf('@')
      if (atIdx === 0 || beforeCursor[atIdx - 1] === ' ') {
        setMentionIndex(atIdx)
        setMentionFilter(match[1])
        return
      }
    }
    setMentionIndex(-1)
  }

  const selectMention = (userName) => {
    const beforeAt = reply.slice(0, mentionIndex)
    const afterCursor = reply.slice(replyInputRef.current?.selectionStart || reply.length)
    const newText = `${beforeAt}@${userName} ${afterCursor}`
    setReply(newText)
    setMentionIndex(-1)
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus()
        const newCursorPos = beforeAt.length + userName.length + 2
        replyInputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 50)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target) &&
        replyInputRef.current &&
        !replyInputRef.current.contains(event.target)) {
        setMentionIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const sendReply = async () => {
    if (!reply.trim() && !replyAttachment) return
    if (isSendingReply) return

    setIsSendingReply(true)
    try {
      let finalMessageText = reply.trim()

      if (replyAttachment) {
        // Upload file first
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(replyAttachment.file)
        })

        const url = 'https://script.google.com/macros/s/AKfycbwT8ub3UKW8-fj-S19hSOhRKp6F9SLfPgCvJTyUnpB-5rD6a0ElMDo7sQ9UhwLvRLsQ/exec'
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload_file',
            filename: replyAttachment.name,
            mimeType: replyAttachment.type,
            base64: base64Data.split(',')[1],
            projectName: task.client || 'General',
            department: task.department || 'COMMON'
          })
        })
        const data = await res.json()
        if (data.ok) {
          finalMessageText = `[Attachment:${replyAttachment.name}|${replyAttachment.type}|${data.downloadUrl || data.url}]${finalMessageText}`
        } else {
          throw new Error(data.error)
        }
      }

      const tempId = String(Date.now())
      const isoTimestamp = new Date().toISOString()
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      const newMessage = {
        id: tempId,
        type: 'sent',
        text: finalMessageText,
        time: now,
        timestamp: isoTimestamp
      }

      setMessagesByChatId(prev => ({
        ...prev,
        [task.id]: [...(prev[task.id] || []), newMessage]
      }))

      const payload = {
        id: tempId,
        action: 'send',
        roomId: String(task.id),
        senderId: profile?.email || 'mansi@dreamsdesign.in',
        senderName: profile?.name || 'Mansi Shah',
        message: finalMessageText,
        timestamp: new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2'),
        type: 'task_reply',
        groupName: task.title
      }

      import('../context/AppContext.jsx').then(({ mqttClient }) => {
        if (mqttClient && mqttClient.connected) {
          mqttClient.publish('dd_chat_engine_v1/' + task.id, JSON.stringify(payload))
        }
      })

      const url = 'https://script.google.com/macros/s/AKfycbwT8ub3UKW8-fj-S19hSOhRKp6F9SLfPgCvJTyUnpB-5rD6a0ElMDo7sQ9UhwLvRLsQ/exec'
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(e => console.warn(e))

      // Webhook fallback already catches this

      setReply('')
      setReplyAttachment(null)

    } catch (err) {
      console.error(err)
      alert("Failed to send reply: " + err.message)
    } finally {
      setIsSendingReply(false)
      if (replyFileInputRef.current) replyFileInputRef.current.value = ''
    }
  }

  const handleReplyFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setInfoModal({
        title: 'File Too Large',
        message: 'File size should be less than 4MB',
        icon: 'warning',
        color: 'text-[#f59e0b]'
      })
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setReplyAttachment({
        name: file.name,
        type: file.type,
        dataUrl: event.target.result,
        file: file
      })
    }
    reader.readAsDataURL(file)
  }

  const handleLike = (commentId) => {
    const updated = (task.comments || []).map((c) =>
      c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c
    )
    updateTask(task.id, { comments: updated })
  }

  const handleSaveStatus = () => {
    updateTask(task.id, {
      status: localStatus,
      done: localStatus === 'Done',
    })
    setInfoModal({
      title: 'Status Updated',
      message: `Status saved: ${localStatus}`,
      icon: 'check_circle',
      color: 'text-[#25d366]'
    })
  }

  const taskMessages = messagesByChatId?.[task.id] || []
  const processedMessages = processMessagesList(taskMessages, profile)

  // Add legacy remarks as system messages
  const legacyComments = (task.comments || [])
    .filter((c) => !(c.type === 'system' && c.text?.startsWith('Status changed to ')))
    .map(c => {
      return {
        id: `legacy_${c.id}`,
        type: c.type === 'self' ? 'sent' : (c.type === 'other' ? 'received' : 'system'),
        sender: c.author,
        text: c.text,
        time: c.time
      }
    })

  const allMessages = [...legacyComments, ...processedMessages]

  const mentionableUsers = Array.from(new Set([
    ...(task.assignedTo || '').split(',').map(s => s.trim()).filter(Boolean),
    (task.assignedBy || '').trim()
  ].filter(Boolean)))

  return (
    <div className="bg-background text-on-surface flex h-screen overflow-hidden">
      <Sidebar />

      <div className="md:ml-[240px] flex flex-col flex-1 h-screen overflow-hidden">
        <TopNav />

        {/* Main canvas */}
        <main className="pt-0 flex-1 bg-background overflow-y-auto custom-scrollbar">
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
            {/* â”€â”€ LEFT COLUMN (65%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="w-full lg:w-[65%] space-y-8">
              {/* Breadcrumb */}
              <button
                onClick={() => navigate('/tasks')}
                className="flex items-center gap-2 group cursor-pointer w-fit"
              >
                <span className="material-symbols-outlined text-primary group-hover:-translate-x-1 transition-transform">
                  arrow_back
                </span>
                <span className="text-label-lg font-label-lg text-secondary">My Tasks</span>
              </button>

              {/* Title row */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-mono text-[13px] bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-bold">
                  {task.id}
                </span>
                <h2 className="text-[26px] font-bold text-on-surface leading-tight">{task.title}</h2>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-brand-accent text-primary px-3 py-1.5 rounded-full text-label-sm font-label-sm border border-divider">
                  {task.client}
                </span>
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                <span className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-1 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  {task.dueDate}
                </span>
                <span className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-1.5 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  Assigned to: {task.assignedTo || 'Unassigned'}
                </span>
                <span className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-1.5 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px]">assignment_ind</span>
                  Assigned by: {task.assignedBy || 'Mansi Shah'}
                </span>
                <button
                  onClick={handleToggleTimer}
                  title="Track Time"
                  className={`px-3 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-1.5 border transition-all cursor-pointer ${isTracking ? 'bg-urgent-red/10 text-urgent-red border-urgent-red/30 shadow-sm' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'}`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isTracking ? 'animate-pulse' : ''}`}>
                    {isTracking ? 'stop_circle' : 'play_circle'}
                  </span>
                  {isTracking ? `Tracking: ${formatTimeStr(sessionSecs)}` : `Time: ${task.timeTaken || '0h 0m'}`}
                </button>
                {profile?.systemRole !== 'Employee' && (
                  <button
                    onClick={() => setTaskToDelete(task.id)}
                    className="px-3 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-1.5 border border-urgent-red/30 text-urgent-red bg-urgent-red/5 hover:bg-urgent-red/10 transition-all cursor-pointer shadow-sm"
                    title="Delete Task"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete
                  </button>
                )}
              </div>

              <hr className="border-divider" />

              {/* Description */}
              <section className="space-y-4">
                <h3 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider">
                  Description
                </h3>
                <div className="text-[15px] leading-relaxed text-[#3D3D3D] space-y-4">
                  <p>{task.description.intro}</p>
                  <ul className="list-disc pl-6 space-y-2">
                    {task.description.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  <p>{task.description.outro}</p>
                </div>
              </section>

              <hr className="border-divider" />

              {/* Subtasks */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-label-lg font-label-lg text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">checklist</span>
                    Subtasks
                  </h3>
                </div>
                
                {/* List of existing subtasks */}
                {subtasks.length > 0 && (
                  <div className="space-y-2">
                    {subtasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl">
                        <input 
                          type="checkbox" 
                          checked={st.status === 'Done'}
                          onChange={(e) => {
                             updateTask(st.id, { status: e.target.checked ? 'Done' : 'Pending' })
                          }}
                          className="w-5 h-5 accent-primary cursor-pointer rounded"
                        />
                        <div className={`flex-1 ${st.status === 'Done' ? 'line-through text-secondary' : 'text-on-surface'}`}>
                          <p className={`font-medium text-[14px] ${st.overdue ? 'text-urgent-red' : ''}`}>{st.title}</p>
                        </div>
                        {st.priority && (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold shrink-0 ${
                            st.priority === 'Urgent' ? 'bg-urgent-red/10 border-urgent-red/30 text-urgent-red' :
                            st.priority === 'High' ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' :
                            st.priority === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' :
                            'bg-blue-500/10 border-blue-500/30 text-blue-600'
                          }`}>
                            <span className="material-symbols-outlined text-[12px]">flag</span>
                            {st.priority}
                          </div>
                        )}
                        {st.dueDate && (
                          <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/50 shrink-0">
                            <span className="material-symbols-outlined text-[13px] text-secondary">calendar_month</span>
                            <span className="text-[11px] font-bold text-secondary">{new Date(st.dueDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                          </div>
                        )}
                        {st.assignedTo && (
                          <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/50 shrink-0">
                            <span className="material-symbols-outlined text-[13px] text-secondary">person</span>
                            <span className="text-[11px] font-bold text-secondary truncate max-w-[100px]">{st.assignedTo}</span>
                          </div>
                        )}
                        {profile?.systemRole !== 'Employee' && (
                          <button 
                            onClick={() => setSubtaskToDelete(st.id)}
                            className="p-1 text-secondary hover:text-urgent-red transition-colors shrink-0"
                            title="Delete Subtask"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new subtask inline creator */}
                {!isSubtaskInputActive ? (
                  <button 
                    onClick={() => setIsSubtaskInputActive(true)}
                    className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl text-secondary hover:bg-surface-container-low hover:text-primary transition-colors text-[14px] font-medium w-full text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add subtask
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 mt-4 bg-surface-container-lowest p-4 rounded-xl border border-primary/40 focus-within:border-primary transition-colors shadow-sm">
                    <div className="flex items-center gap-2 border-b border-divider pb-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">radio_button_unchecked</span>
                      <input 
                        type="text" 
                        placeholder="Task Name or type '/' for commands"
                        value={newSubtaskTitle}
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        autoFocus
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] outline-none w-full p-0 text-on-surface"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddSubtask()
                          if (e.key === 'Escape') setIsSubtaskInputActive(false)
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Assignee Selector */}
                        <div className="relative group">
                          <select 
                            value={newSubtaskAssignee}
                            onChange={e => setNewSubtaskAssignee(e.target.value)}
                            className="appearance-none bg-surface-container hover:bg-surface-container-high text-[12px] font-medium border border-outline-variant/50 rounded-lg focus:ring-1 focus:ring-primary outline-none py-1.5 pl-7 pr-6 cursor-pointer text-secondary group-hover:text-primary transition-colors h-[32px]"
                            title="Assign to"
                          >
                            <option value="">Unassigned</option>
                            {uniqueTeamMembers.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-secondary group-hover:text-primary transition-colors">person_add</span>
                        </div>
                        
                        {/* Due Date Selector */}
                        <div className="relative group flex items-center bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 rounded-lg h-[32px] px-2 overflow-hidden transition-colors">
                           <span className="material-symbols-outlined text-[14px] text-secondary group-hover:text-primary mr-1 transition-colors">calendar_month</span>
                           <input 
                            type="date" 
                            value={newSubtaskDueDate}
                            onChange={handleDueDateChange}
                            className="bg-transparent text-[12px] font-medium focus:ring-0 border-none outline-none p-0 cursor-pointer text-secondary group-hover:text-primary w-min"
                            title="Due Date"
                          />
                        </div>

                        {/* Priority Selector */}
                        <div className="relative group">
                          <select 
                            value={newSubtaskPriority}
                            onChange={e => setNewSubtaskPriority(e.target.value)}
                            className="appearance-none bg-surface-container hover:bg-surface-container-high text-[12px] font-medium border border-outline-variant/50 rounded-lg focus:ring-1 focus:ring-primary outline-none py-1.5 pl-7 pr-6 cursor-pointer text-secondary group-hover:text-primary transition-colors h-[32px]"
                            title="Priority"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                          <span className="material-symbols-outlined text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-secondary group-hover:text-primary transition-colors">flag</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsSubtaskInputActive(false)}
                          className="px-3 py-1.5 rounded-lg text-secondary hover:bg-surface-container-high text-[13px] font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleAddSubtask}
                          disabled={!newSubtaskTitle.trim()}
                          className="bg-primary text-white px-4 py-1.5 rounded-lg font-bold text-[13px] hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                          Save
                          <span className="material-symbols-outlined text-[14px]">keyboard_return</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Comments / Replies Section */}
              <section className="space-y-6 pt-6">
                <div className="flex flex-col items-center gap-4">
                  <h3 className="text-[16px] font-bold text-primary font-['Montserrat'] uppercase tracking-wider self-start">
                    Task Replies &amp; Updates
                  </h3>
                  <button className="text-primary text-label-sm font-label-sm hover:underline">
                    Load earlier replies
                  </button>
                </div>

                <div ref={scrollRef} className="space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {allMessages.map((m, index) => {
                    if (m.type === 'system' || m.type === 'divider') {
                      return (
                        <div key={index} className="relative flex items-center justify-center py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-divider"></div>
                          </div>
                          <div className="relative bg-background px-4">
                            <p className={`text-[12px] text-[#6B6B6B] ${m.type === 'system' ? 'italic' : 'font-bold'} font-['Montserrat']`}>
                              {m.label || m.text}
                            </p>
                          </div>
                        </div>
                      )
                    }

                    if (m.type === 'received') {
                      return (
                        <div key={index} className="flex items-start gap-3">
                          {renderAvatar(null, m.sender, "w-9 h-9 rounded-full mt-1")}
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold font-['Montserrat'] text-on-surface">
                                {m.sender}
                              </span>
                              <span className="text-[11px] font-normal font-['Montserrat'] text-[#6B6B6B]">
                                {m.time}
                              </span>
                            </div>
                            <div className="bg-brand-accent p-4 rounded-xl rounded-tl-none border border-divider max-w-md">
                              {renderMessageText(m.text, false, m.isDeleted, employees.map(e => e.name))}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Self message (type === 'sent')
                    return (
                      <div key={index} className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-normal font-['Montserrat'] text-[#6B6B6B]">
                            {m.time}
                          </span>
                          <span className="text-[14px] font-semibold font-['Montserrat'] text-on-surface">
                            {m.sender || profile?.name}
                          </span>
                          {renderAvatar(profile?.avatar, profile?.name, "w-9 h-9 rounded-full")}
                        </div>
                        <div className="bg-primary p-4 rounded-xl rounded-tr-none max-w-md shadow-sm">
                          <div className="text-white text-body-sm">
                            {renderMessageText(m.text, true, m.isDeleted, employees.map(e => e.name))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Bottom Input */}
                <div className="space-y-3">
                  <div className="bg-surface rounded-lg border border-outline-variant/60 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-sm relative">
                    {/* Mention Dropdown */}
                    {mentionIndex !== -1 && (
                      <div
                        ref={mentionDropdownRef}
                        className="absolute bottom-full mb-2 left-4 w-64 bg-surface rounded-xl shadow-lg border border-divider overflow-hidden z-50 card-shadow"
                      >
                        <div className="max-h-[200px] overflow-y-auto">
                          {mentionableUsers
                            .filter(u => u.toLowerCase().includes(mentionFilter.toLowerCase()))
                            .map((userName, idx) => (
                              <button
                                key={idx}
                                onClick={() => selectMention(userName)}
                                className="w-full text-left px-4 py-2 hover:bg-black/5 text-label-md font-medium text-on-surface flex items-center gap-2 transition-colors"
                              >
                                {renderAvatar(null, userName, "w-6 h-6 rounded-full")}
                                {userName}
                              </button>
                            ))}
                          {mentionableUsers.filter(u => u.toLowerCase().includes(mentionFilter.toLowerCase())).length === 0 && (
                            <div className="px-4 py-3 text-body-sm text-secondary italic">No matching task members</div>
                          )}
                        </div>
                      </div>
                    )}
                    <textarea
                      ref={replyInputRef}
                      className="w-full bg-transparent border-none focus:ring-0 text-body-sm font-body-sm p-4 min-h-[100px] resize-none outline-none"
                      placeholder="Write your reply... (type @ to mention)"
                      value={reply}
                      onChange={handleReplyChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendReply()
                        }
                      }}
                    ></textarea>
                    <div className="flex items-center justify-between px-4 pb-4 border-t border-divider pt-3 mt-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          ref={replyFileInputRef}
                          className="hidden"
                          onChange={handleReplyFileChange}
                        />
                        <button
                          onClick={() => replyFileInputRef.current?.click()}
                          className={`flex items-center gap-1 ${replyAttachment ? 'text-primary' : 'text-secondary hover:text-primary'} transition-colors`}
                          title="Attach file"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {replyAttachment ? 'attach_file_add' : 'attach_file'}
                          </span>
                        </button>
                        {replyAttachment && (
                          <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded">
                            <span className="text-[11px] text-primary font-medium truncate max-w-[150px]">{replyAttachment.name}</span>
                            <button onClick={() => setReplyAttachment(null)} className="text-primary hover:text-red-500">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        )}
                        <span className="text-[11px] text-[#6B6B6B] font-['Montserrat'] ml-2">
                          {reply.length} / 1000
                        </span>
                      </div>
                      <button
                        onClick={sendReply}
                        disabled={isSendingReply || (!reply.trim() && !replyAttachment)}
                        className="bg-primary text-on-primary px-6 py-2 rounded-md font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm text-[13px]"
                      >
                        {isSendingReply ? (
                          <>
                            <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* â”€â”€ RIGHT COLUMN (35%) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="w-full lg:w-[35%] space-y-6">
              {/* Task Info Card */}
              <div className="bg-surface p-6 rounded-lg border border-outline-variant/40 shadow-sm">
                <h3 className="text-label-md font-label-md text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">info</span> Task Information
                </h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-body-sm text-secondary mt-1">Assigned To</span>
                    <div className="flex flex-col gap-2 items-end">
                      {(task.assignedTo || 'Unassigned').split(',').map((assignee, idx) => {
                        const trimmedAssignee = assignee.trim()
                        if (!trimmedAssignee) return null
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-label-md font-label-md">{trimmedAssignee}</span>
                            {trimmedAssignee === profile.name && profile.avatar ? (
                              <img
                                className="w-6 h-6 rounded-full object-cover"
                                src={profile.avatar}
                                alt={trimmedAssignee}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold">
                                {getInitials(trimmedAssignee)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <button
                        onClick={() => setIsAssigneeModalOpen(true)}
                        className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline mt-1 bg-primary/10 px-2 py-1 rounded transition-all hover:bg-primary/20"
                      >
                        <span className="material-symbols-outlined text-[14px]">person_add</span> Manage Assignees
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-secondary">Assigned By</span>
                    <div className="flex items-center gap-2">
                      <span className="text-label-md font-label-md">{task.assignedBy || 'Mansi Shah'}</span>
                      {task.assignedBy === profile.name && profile.avatar ? (
                        <img
                          className="w-6 h-6 rounded-full object-cover"
                          src={profile.avatar}
                          alt={task.assignedBy}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold">
                          {getInitials(task.assignedBy || 'Mansi Shah')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-secondary">Assigned Date</span>
                    <span className="text-label-md font-label-md">{task.assigned}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-secondary">Due Date</span>
                    <span className="text-label-md font-label-md">{task.dueDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-secondary">Status</span>
                    <span className={`text-label-sm font-label-sm font-bold ${(!task.daysOverdue || task.daysOverdue === 'No') ? 'text-success-green' : 'text-urgent-red'
                      }`}>
                      Days Overdue: {task.daysOverdue || 'No'}
                    </span>
                  </div>
                  <hr className="border-divider" />
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-secondary">Client</span>
                    <span className="text-label-md font-label-md text-primary">{task.client}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-body-sm text-secondary">Department</span>
                    <span className="text-label-md font-label-md">{task.department || 'COMMON'}</span>
                  </div>
                </div>
              </div>

              {/* Update Status Card */}
              {(() => {
                const assignees = (task.assignedTo || '').split(',').map(s => s.trim())
                const isAssigned = assignees.includes(profile?.name)

                if (!isAssigned) {
                  return (
                    <div className="bg-surface p-6 rounded-lg border border-outline-variant/40 shadow-sm opacity-80">
                      <h3 className="text-label-md font-label-md text-on-surface mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">lock</span> Update Status
                      </h3>
                      <p className="text-body-sm text-secondary italic">Only assigned users can update the status of this task.</p>
                    </div>
                  )
                }

                return (
                  <div className="bg-surface p-6 rounded-lg border border-outline-variant/40 shadow-sm">
                    <h3 className="text-label-md font-label-md text-on-surface mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">published_with_changes</span> Update
                      Status
                    </h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <select
                          value={localStatus}
                          onChange={(e) => setLocalStatus(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-divider rounded-lg px-4 py-3 text-body-sm font-body-sm focus:border-primary focus:ring-0 appearance-none cursor-pointer outline-none"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Review">Review</option>
                          <option value="Done">Done</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3.5 text-secondary pointer-events-none">
                          expand_more
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setLocalStatus('Done')}
                          className="bg-success-green text-white py-2.5 rounded-lg text-label-sm font-label-sm flex items-center justify-center gap-1 hover:brightness-105 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">check_circle</span> Done
                        </button>
                        <button
                          onClick={() => setLocalStatus('Pending')}
                          className="border border-urgent-red text-urgent-red py-2.5 rounded-lg text-label-sm font-label-sm flex items-center justify-center gap-1 hover:bg-urgent-red/5 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span> Not Done
                        </button>
                      </div>
                      <button
                        onClick={handleSaveStatus}
                        className="w-full bg-primary text-on-primary py-3 rounded-md font-medium shadow-sm hover:opacity-90 active:scale-[0.98] transition-all mt-2 text-[13px]"
                      >
                        Save Status
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Priority Card */}
              {(() => {
                const config = getPriorityConfig(task.priority)
                return (
                  <div className="bg-surface p-6 rounded-lg border border-outline-variant/40 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-label-md font-label-md text-on-surface">Priority</h3>
                      <span className={`${config.badgeClass} text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${config.iconClass} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span
                          className="material-symbols-outlined text-[28px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          priority_high
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className={`text-label-lg font-label-lg ${config.textClass}`}>{task.priority}</p>
                        <p className="text-[12px] text-secondary leading-tight mt-1">
                          {config.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Attachments Section */}
              <div className="bg-brand-accent p-6 rounded-xl border border-divider card-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-label-md font-label-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">link</span> Attachment Links
                  </h3>
                  <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {task.attachments?.length || 0} Links
                  </span>
                </div>

                {/* Add Link Form */}
                <div className="space-y-3 mb-6 bg-surface-container-lowest/50 p-4 rounded-lg border border-divider">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Link URL</label>
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="Paste your link here"
                      className="w-full bg-surface-container-lowest border border-divider rounded-lg px-3 py-2 text-body-sm focus:border-primary focus:ring-0 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!linkUrl.trim()) {
                        alert('Please enter a valid link URL.');
                        return;
                      }
                      let formattedUrl = linkUrl.trim();
                      if (!/^https?:\/\//i.test(formattedUrl)) {
                        formattedUrl = 'https://' + formattedUrl;
                      }

                      try {
                        new URL(formattedUrl);
                      } catch (e) {
                        alert('Please enter a valid link URL.');
                        return;
                      }

                      const newAttachment = {
                        name: linkUrl.trim(),
                        url: formattedUrl,
                        size: 'Link'
                      }

                      const updatedAttachments = [...(task.attachments || []), newAttachment]

                      updateTask(task.id, {
                        attachments: updatedAttachments,
                        attachmentLink: formattedUrl
                      })

                      setLinkUrl('')
                      alert('Attachment link added successfully and synced to Google Sheets!')
                    }}
                    className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-sm font-label-sm shadow-sm hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_link</span>
                    Add Link Attachment
                  </button>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-divider">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full bg-surface-container-high text-primary border border-primary/20 py-2.5 rounded-lg text-label-sm font-label-sm shadow-sm hover:bg-primary/5 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isUploading ? 'hourglass_empty' : 'upload_file'}
                      </span>
                      {isUploading ? 'Uploading Files...' : 'Upload Files (Image, Files, Audio)'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {(task.attachments || []).length === 0 ? (
                    <div className="text-center py-6 text-secondary text-body-sm italic bg-surface-container-lowest/30 rounded-lg border border-dashed border-[#E8DDF0]">
                      No link attachments added yet.
                    </div>
                  ) : (
                    (task.attachments || []).map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-divider hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <span className="material-symbols-outlined text-[20px] text-primary flex-shrink-0">
                            link
                          </span>
                          <div className="truncate">
                            <a
                              href={file.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-label-md font-label-md text-primary hover:underline truncate block"
                              title={file.name}
                            >
                              {file.name}
                            </a>
                            <p className="text-[10px] text-secondary truncate">{file.url || 'No URL'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {file.downloadUrl && (
                            <a
                              href={file.downloadUrl}
                              className="w-7 h-7 rounded-full hover:bg-primary/10 flex items-center justify-center text-secondary hover:text-primary transition-all"
                              title="Download"
                            >
                              <span className="material-symbols-outlined text-[18px]">download</span>
                            </a>
                          )}
                          <button
                            onClick={() => setAttachmentToDelete(idx)}
                            className="w-7 h-7 rounded-full hover:bg-error/10 flex items-center justify-center text-secondary hover:text-error transition-all"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-4 px-4 md:px-8 bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center">
          <p className="text-label-sm font-label-sm text-secondary">Â© 2024 Dreamsdesk Internal Systems</p>
          <div className="flex gap-6">
            <a href="#" className="text-label-sm font-label-sm text-secondary hover:text-primary transition-colors">
              Support
            </a>
            <a href="#" className="text-label-sm font-label-sm text-secondary hover:text-primary transition-colors">
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>

      {/* Assignee Modal */}
      {isAssigneeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-surface-container-lowest w-[400px] rounded-xl shadow-xl p-6 flex flex-col gap-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center border-b border-divider pb-3">
              <h2 className="text-[18px] font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">group_add</span>
                Manage Assignees
              </h2>
              <button
                type="button"
                onClick={() => setIsAssigneeModalOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1">
              {uniqueTeamMembers.map((m) => (
                <label key={m} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low cursor-pointer rounded-lg border border-transparent hover:border-outline-variant transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(m)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAssignees([...selectedAssignees, m])
                      } else {
                        setSelectedAssignees(selectedAssignees.filter(name => name !== m))
                      }
                    }}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                  <span className="text-body-sm text-on-surface font-medium">{m}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-divider">
              <button
                onClick={() => setIsAssigneeModalOpen(false)}
                className="px-6 py-2 border border-primary text-primary rounded-lg font-label-md hover:bg-primary/5 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignees}
                className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md shadow-md hover:brightness-105 active:scale-95 transition-all text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Attachment Confirmation Modal */}
      {attachmentToDelete !== null && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-surface-container-lowest w-[350px] rounded-xl shadow-xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h2 className="text-[18px] font-bold">Delete Attachment</h2>
            </div>
            <p className="text-body-sm text-secondary">
              Are you sure you want to delete this attachment?
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAttachmentToDelete(null)}
                className="px-5 py-2 border border-outline text-secondary rounded-lg font-label-md hover:bg-surface-container-low transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updated = (task.attachments || []).filter((_, i) => i !== attachmentToDelete);
                  updateTask(task.id, { attachments: updated });
                  setAttachmentToDelete(null);
                }}
                className="px-5 py-2 bg-error text-on-error rounded-lg font-label-md shadow-md hover:brightness-105 active:scale-95 transition-all text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-scale-in flex flex-col border border-outline-variant">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant bg-surface-container-low">
              <div className="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
              </div>
              <h2 className="text-label-lg font-bold text-on-surface">Delete Task</h2>
            </div>
            <div className="px-6 py-5 bg-surface-container-lowest">
              <p className="text-body-sm text-secondary leading-relaxed">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-5 py-2 border border-outline-variant text-secondary rounded-lg font-label-md hover:bg-surface-container-high transition-all text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteTask(taskToDelete)
                  setTaskToDelete(null)
                  navigate('/tasks')
                }}
                className="px-5 py-2 bg-error text-on-error rounded-lg font-label-md shadow-md hover:brightness-105 active:scale-95 transition-all text-sm font-bold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subtask Confirmation Modal */}
      {subtaskToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-scale-in flex flex-col border border-outline-variant">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant bg-surface-container-low">
              <div className="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
              </div>
              <h2 className="text-label-lg font-bold text-on-surface">Delete Subtask</h2>
            </div>
            <div className="px-6 py-5 bg-surface-container-lowest">
              <p className="text-body-sm text-secondary leading-relaxed">
                Are you sure you want to delete this subtask? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setSubtaskToDelete(null)}
                className="px-5 py-2 border border-outline-variant text-secondary rounded-lg font-label-md hover:bg-surface-container-high transition-all text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteTask(subtaskToDelete)
                  setSubtaskToDelete(null)
                }}
                className="px-5 py-2 bg-error text-on-error rounded-lg font-label-md shadow-md hover:brightness-105 active:scale-95 transition-all text-sm font-bold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-scale-in flex flex-col border border-outline-variant">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant bg-surface-container-low">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                infoModal.color?.includes('error') ? 'bg-error/10 text-error' : 
                infoModal.color?.includes('warning') || infoModal.color?.includes('f59e0b') ? 'bg-warning/10 text-[#f59e0b]' : 
                'bg-primary/10 text-primary'
              }`}>
                <span className="material-symbols-outlined text-[20px]">{infoModal.icon || 'info'}</span>
              </div>
              <h2 className="text-label-lg font-bold text-on-surface">{infoModal.title}</h2>
            </div>
            <div className="px-6 py-5 bg-surface-container-lowest">
              <p className="text-body-sm text-secondary leading-relaxed">
                {infoModal.message}
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setInfoModal(null)}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md shadow-md hover:brightness-105 active:scale-95 transition-all text-sm font-bold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



