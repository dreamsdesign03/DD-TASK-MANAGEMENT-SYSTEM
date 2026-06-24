import React, { useMemo, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'

export default function ProjectOverviewPage() {
  const { projectName } = useParams()
  const navigate = useNavigate()
  const { tasks, messagesByChatId, fetchMessages } = useApp()
  const [driveDocs, setDriveDocs] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  const [filterTaskId, setFilterTaskId] = useState('All Tasks')
  const [filterDept, setFilterDept] = useState('All Departments')
  const [docsViewMode, setDocsViewMode] = useState('List') // 'List' | 'Grid'

  const getDriveFileId = (url) => {
    if (!url) return null
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  const getDisplayName = (name) => {
    if (!name) return 'Document'
    if (name.includes('drive.google.com')) return 'Google Drive File'
    if (name.startsWith('http://') || name.startsWith('https://')) return 'Web Link'
    return name
  }

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Fetch documents directly from Google Drive for this project
  useEffect(() => {
    if (!projectName) return
    setIsLoadingDocs(true)
    const url = `https://script.google.com/macros/s/AKfycbwT8ub3UKW8-fj-S19hSOhRKp6F9SLfPgCvJTyUnpB-5rD6a0ElMDo7sQ9UhwLvRLsQ/exec?action=get_project_files&projectName=${encodeURIComponent(projectName)}&t=${Date.now()}`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.files) {
          setDriveDocs(data.files)
        }
      })
      .catch(err => console.error("Failed to fetch project files from drive:", err))
      .finally(() => setIsLoadingDocs(false))
  }, [projectName])

  const projectTasks = useMemo(() => {
    if (!tasks) return []
    return tasks.filter(t => t.client === projectName)
  }, [tasks, projectName])

  const uniqueTaskIds = useMemo(() => {
    return ['All Tasks', ...new Set(projectTasks.map(t => t.id))]
  }, [projectTasks])

  const uniqueDepts = useMemo(() => {
    const rawDepts = projectTasks.map(t => t.department || 'COMMON')
    return ['All Departments', 'COMMON', 'SOCIAL MEDIA', 'WEBSITE', 'SEO', 'GRAPHIC', 'HR', 'ACCOUNT', 'SALES', ...new Set(rawDepts.map(d => d.toUpperCase()))]
  }, [projectTasks])
  const deduplicatedDepts = [...new Set(uniqueDepts)]

  const recentTasks = useMemo(() => {
    let filtered = projectTasks
    if (filterTaskId !== 'All Tasks') {
      filtered = filtered.filter(t => t.id === filterTaskId)
    }
    if (filterDept !== 'All Departments') {
      filtered = filtered.filter(t => (t.department || 'COMMON').toUpperCase() === filterDept.toUpperCase())
    }

    return filtered.sort((a, b) => {
      const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0
      const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0
      return numB - numA
    }).slice(0, 15)
  }, [projectTasks, filterTaskId, filterDept])

  const allDocs = useMemo(() => {
    const docs = []
    projectTasks.forEach(t => {
      if (t.attachments && Array.isArray(t.attachments)) {
        t.attachments.forEach(att => {
          let docToPush = {
            taskId: t.id,
            taskTitle: t.title,
            ...att
          }
          
          // Try to enrich from driveDocs if possible to get real name and type
          const fileId = getDriveFileId(att.url)
          if (fileId && driveDocs) {
             const driveMatch = driveDocs.find(d => getDriveFileId(d.url) === fileId)
             if (driveMatch) {
               docToPush.name = driveMatch.name
               let typeStr = driveMatch.type
               if (typeStr.includes('pdf')) typeStr = 'pdf'
               else if (typeStr.includes('image')) typeStr = 'image'
               else typeStr = 'document'
               docToPush.type = typeStr
             }
          }
          docs.push(docToPush)
        })
      }

      // Also grab attachments sent in chat messages
      const msgs = messagesByChatId?.[t.id] || []
      msgs.forEach(m => {
        const text = m.text || ''
        if (text.startsWith('[Attachment:')) {
          const match = text.match(/^\[Attachment:([^|]+)\|([^|]+)\|([^\]]+)\]/)
          if (match) {
            let typeStr = match[2]
            if (typeStr.includes('pdf')) typeStr = 'pdf'
            else if (typeStr.includes('image')) typeStr = 'image'
            else typeStr = 'document'
            
            docs.push({
              taskId: t.id,
              taskTitle: t.title,
              name: match[1],
              type: typeStr,
              url: match[3]
            })
          }
        }
      })
    })

    // 3. Add files fetched directly from Drive
    driveDocs.forEach(d => {
      // Deduplicate by Google Drive File ID instead of exact URL to prevent showing the same file twice
      const fileId = getDriveFileId(d.url)
      const isDuplicate = docs.some(existing => {
         if (fileId && getDriveFileId(existing.url) === fileId) return true
         return existing.url === d.url
      })

      if (!isDuplicate) {
        let typeStr = d.type
        if (typeStr.includes('pdf')) typeStr = 'pdf'
        else if (typeStr.includes('image')) typeStr = 'image'
        else typeStr = 'document'

        docs.push({
          taskId: 'N/A',
          taskTitle: d.department + ' Folder',
          name: d.name,
          type: typeStr,
          url: d.url,
          department: d.department
        })
      }
    })

    // Apply Filters
    let filteredDocs = docs
    if (filterTaskId !== 'All Tasks') {
      // If filtering by specific task ID, only show attachments tied to that task.
      // Drive documents (N/A) will be hidden unless we specifically match somehow.
      filteredDocs = filteredDocs.filter(d => d.taskId === filterTaskId)
    }
    
    if (filterDept !== 'All Departments') {
      filteredDocs = filteredDocs.filter(d => {
        if (d.taskId === 'N/A') {
          // Check drive file department
          return (d.department || '').toUpperCase() === filterDept.toUpperCase() || 
                 (d.taskTitle || '').toUpperCase().includes(filterDept.toUpperCase())
        } else {
          // Check task department
          const parentTask = projectTasks.find(t => t.id === d.taskId)
          if (parentTask) {
            return (parentTask.department || 'COMMON').toUpperCase() === filterDept.toUpperCase()
          }
          return true
        }
      })
    }

    return filteredDocs
  }, [projectTasks, messagesByChatId, driveDocs, filterTaskId, filterDept])

  const totalTasks = projectTasks.length
  const completedTasks = projectTasks.filter(t => t.status === 'Done').length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="bg-surface text-on-surface flex h-[100dvh] overflow-hidden">
      <Sidebar />

      <main className="md:ml-[240px] flex-1 flex flex-col h-[100dvh] overflow-hidden bg-surface-container-lowest">
        <TopNav />

        {/* Header Area */}
        <div className="bg-surface-container-lowest border-b border-outline-variant/50 pt-6 px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">domain</span>
            </div>
            <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="text-secondary/70">Projects / </span>
              {projectName}
            </h1>
          </div>

          {/* Tabs and Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-transparent pb-1">
            {/* Tabs */}
            <div className="flex items-center gap-6">
              <button className="px-1 py-3 text-sm font-bold text-primary border-b-2 border-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Overview
              </button>
              <button 
                onClick={() => navigate('/tasks', { state: { clientFilter: projectName } })}
                className="px-1 py-3 text-sm font-medium text-secondary hover:text-on-surface flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">list</span>
                Tasks List
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-1">
              <div className="relative min-w-[150px]">
                <select
                  value={filterTaskId}
                  onChange={(e) => setFilterTaskId(e.target.value)}
                  className="w-full appearance-none bg-surface-container-low border border-outline-variant/60 rounded-lg px-3 py-1.5 pr-8 text-[13px] font-bold text-on-surface focus:border-primary focus:ring-0 outline-none cursor-pointer"
                >
                  {uniqueTaskIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1.5 text-secondary pointer-events-none text-[16px]">expand_more</span>
              </div>
              <div className="relative min-w-[170px]">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full appearance-none bg-surface-container-low border border-outline-variant/60 rounded-lg px-3 py-1.5 pr-8 text-[13px] font-bold text-on-surface focus:border-primary focus:ring-0 outline-none cursor-pointer"
                >
                  {deduplicatedDepts.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1.5 text-secondary pointer-events-none text-[16px]">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-8">
            
            {/* Project Progress */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/60 shadow-sm flex flex-col md:flex-row md:items-center gap-6 justify-between">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">data_usage</span>
                  Project Progress
                </h2>
                <p className="text-sm text-secondary mt-1">Track the overall completion of {projectName}</p>
              </div>
              <div className="flex-1 max-w-[400px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-on-surface">Overall Completion</span>
                  <span className="text-sm font-bold text-primary">{completedTasks} / {totalTasks} Tasks</span>
                </div>
                <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden border border-outline-variant/30">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${progressPct === 100 ? 'bg-[#2ECC71]' : 'bg-primary'}`} 
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
                <p className="text-xs text-secondary mt-2 text-right">{progressPct}% Completed</p>
              </div>
            </div>

            <div className="text-center py-4 text-secondary/80 text-sm hidden">
              Get the most out of your Overview! See recent tasks and all attachments related to <strong>{projectName}</strong> below.
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recent Tasks Card */}
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
                <div className="p-6 border-b border-outline-variant/50 flex-shrink-0">
                  <h2 className="text-lg font-bold text-on-surface">Recent Tasks</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  {recentTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-secondary opacity-60">
                      <span className="material-symbols-outlined text-[32px] mb-2">inbox</span>
                      <p>No recent tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recentTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container cursor-pointer transition-colors group"
                        >
                          <span className="material-symbols-outlined text-secondary/50 group-hover:text-primary transition-colors mt-0.5 text-[20px]">
                            list_alt
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                              {task.title}
                            </p>
                            <p className="text-[11px] text-secondary flex items-center gap-2 mt-0.5">
                              <span className="font-medium text-primary/80">{task.id}</span>
                              <span className="w-1 h-1 rounded-full bg-outline"></span>
                              <span>{task.dueDate}</span>
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            task.status === 'Done' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                            task.priority === 'Urgent' ? 'bg-urgent-red/10 text-urgent-red border-urgent-red/30' :
                            task.priority === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                            'bg-blue-500/10 text-blue-600 border-blue-500/30'
                          }`}>
                            {task.status === 'Done' ? 'Done' : task.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Docs / Attachments Card */}
              <div className="bg-surface-container-low rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
                <div className="p-6 border-b border-outline-variant/50 flex-shrink-0 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                    Docs & Attachments
                    {isLoadingDocs && (
                      <span className="material-symbols-outlined animate-spin text-primary ml-2 text-[18px]">
                        refresh
                      </span>
                    )}
                  </h2>
                  <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/60 shadow-sm">
                    <button
                      onClick={() => setDocsViewMode('List')}
                      className={`p-1.5 rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-all ${docsViewMode === 'List' ? 'bg-primary/10 text-primary' : ''}`}
                      title="List View"
                    >
                      <span className="material-symbols-outlined text-[18px]">view_list</span>
                    </button>
                    <button
                      onClick={() => setDocsViewMode('Grid')}
                      className={`p-1.5 rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-all ${docsViewMode === 'Grid' ? 'bg-primary/10 text-primary' : ''}`}
                      title="Grid View"
                    >
                      <span className="material-symbols-outlined text-[18px]">grid_view</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {allDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-secondary opacity-60">
                      <span className="material-symbols-outlined text-[32px] mb-2">folder_off</span>
                      <p>No documents attached to any tasks</p>
                    </div>
                  ) : (
                    <div className={docsViewMode === 'Grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid grid-cols-1 gap-3"}>
                      {allDocs.map((doc, i) => (
                        docsViewMode === 'Grid' ? (
                          <a 
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col rounded-2xl border border-outline-variant hover:border-primary/50 hover:bg-surface-container bg-surface-container-lowest transition-all group shadow-sm text-center h-[180px] overflow-hidden"
                          >
                            <div className="w-full h-24 bg-surface-container-low flex items-center justify-center shrink-0 border-b border-outline-variant/30 relative overflow-hidden">
                              {getDriveFileId(doc.url) ? (
                                <>
                                  <img 
                                    src={`https://drive.google.com/thumbnail?id=${getDriveFileId(doc.url)}&sz=w500`} 
                                    alt={doc.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="hidden absolute inset-0 w-full h-full items-center justify-center bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-300">
                                    <span className="material-symbols-outlined text-[32px]">
                                      {doc.type === 'pdf' ? 'picture_as_pdf' :
                                       doc.type === 'image' ? 'image' :
                                       doc.type === 'document' ? 'article' : 'insert_drive_file'}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-300">
                                  <span className="material-symbols-outlined text-[32px]">
                                    {doc.type === 'pdf' ? 'picture_as_pdf' :
                                     doc.type === 'image' ? 'image' :
                                     doc.type === 'document' ? 'article' : 'insert_drive_file'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="w-full flex-1 flex flex-col items-center justify-center p-3">
                              <p className="text-[12px] font-bold text-on-surface line-clamp-1 px-1 group-hover:text-primary transition-colors" title={doc.name}>
                                {getDisplayName(doc.name)}
                              </p>
                              <div className="text-[10px] text-secondary mt-1 flex flex-col items-center gap-1 w-full px-1">
                                {doc.taskId === 'N/A' ? (
                                  <span className="font-bold text-primary truncate max-w-full">
                                    Drive &rarr; {doc.taskTitle.replace(' Folder', '')}
                                  </span>
                                ) : (
                                  <Link 
                                    to={`/tasks/${doc.taskId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-bold text-primary hover:underline truncate max-w-full"
                                  >
                                    {doc.taskId} - {doc.taskTitle}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </a>
                        ) : (
                          <a 
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-4 p-4 rounded-xl border border-outline-variant hover:border-primary/50 hover:bg-surface-container bg-surface-container-lowest transition-all group shadow-sm"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined">
                                {doc.type === 'pdf' ? 'picture_as_pdf' :
                                 doc.type === 'image' ? 'image' :
                                 doc.type === 'document' ? 'article' : 'insert_drive_file'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-label-md font-bold text-on-surface truncate group-hover:text-primary transition-colors" title={doc.name}>
                                {getDisplayName(doc.name)}
                              </p>
                              <div className="text-[11px] text-secondary mt-1 flex items-center gap-2 truncate">
                                <span>Attached in</span>
                                {doc.taskId === 'N/A' ? (
                                  <span className="font-bold text-primary truncate">
                                    Drive &rarr; {doc.taskTitle}
                                  </span>
                                ) : (
                                  <Link 
                                    to={`/tasks/${doc.taskId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-bold text-primary hover:underline truncate"
                                  >
                                    {doc.taskId} - {doc.taskTitle}
                                  </Link>
                                )}
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                              open_in_new
                            </span>
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
