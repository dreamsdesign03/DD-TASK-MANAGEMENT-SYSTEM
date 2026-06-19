import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TASKS_FILE = path.join(__dirname, 'tasks.json')

const app = express()
app.use(cors())
app.use(express.json())

// Helper to load tasks from file
function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, 'utf8')
      const parsed = JSON.parse(data)
      
      // Clean existing tasks to strip leading '=' and deduplicate
      const cleaned = parsed.map(rawTaskData => {
        const cleanTask = {}
        for (const key in rawTaskData) {
          let val = rawTaskData[key]
          if (typeof val === 'string' && val.startsWith('=')) {
            val = val.substring(1)
          }
          cleanTask[key] = val
        }
        return cleanTask
      })

      // Filter out duplicates based on Task ID / taskId / id
      return cleaned.filter((task, index, self) =>
        index === self.findIndex(t => (t["Task ID"] || t.taskId || t.id) === (task["Task ID"] || task.taskId || task.id))
      )
    }
  } catch (error) {
    console.error('Error loading tasks from file:', error)
  }
  return []
}

// Helper to save tasks to file
function saveTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8')
  } catch (error) {
    console.error('Error saving tasks to file:', error)
  }
}

// Initialize task store
let syncedTasks = loadTasks()
saveTasks(syncedTasks) // Persist cleaned/deduplicated tasks back to file immediately

// n8n pushes task here
app.post('/api/receive-task', (req, res) => {
  const task = req.body
  console.log('Task received from n8n:', task)

  // Extract the actual task payload if it is wrapped in an item/body from n8n
  const rawTaskData = task.body || task

  // Sanitize task data by stripping leading '=' from all string values
  const taskData = {}
  for (const key in rawTaskData) {
    let val = rawTaskData[key]
    if (typeof val === 'string' && val.startsWith('=')) {
      val = val.substring(1)
    }
    taskData[key] = val
  }

  // Ensure it has a taskId to identify it
  const taskId = taskData["Task ID"] || taskData.taskId || taskData.id
  if (!taskId) {
    console.warn('Received task payload without taskId/id:', task)
    return res.status(400).json({ error: 'Missing Task ID, taskId, or id' })
  }

  // Update if exists, add if new
  const idx = syncedTasks.findIndex(t => (t["Task ID"] || t.taskId || t.id) === taskId)
  if (idx > -1) {
    syncedTasks[idx] = taskData
  } else {
    syncedTasks.unshift(taskData)
  }

  saveTasks(syncedTasks)

  console.log('Current synced tasks list:', syncedTasks)
  res.json({ ok: true, count: syncedTasks.length })
})

// Frontend polls this
app.get('/api/tasks', (req, res) => {
  res.json(syncedTasks)
})

// Full replace: called when n8n returns the authoritative task list
// Removes any locally cached tasks that no longer exist in the source (Google Sheets)
app.post('/api/sync-tasks', (req, res) => {
  const incoming = req.body
  if (!Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Expected an array of tasks' })
  }

  // Sanitize each task (strip leading '=' from Google Sheets formula values)
  const cleaned = incoming.map(rawTaskData => {
    const cleanTask = {}
    for (const key in rawTaskData) {
      let val = rawTaskData[key]
      if (typeof val === 'string' && val.startsWith('=')) {
        val = val.substring(1)
      }
      cleanTask[key] = val
    }
    return cleanTask
  })

  syncedTasks = cleaned
  saveTasks(syncedTasks)
  console.log(`[sync-tasks] Replaced task list with ${syncedTasks.length} tasks from n8n`)
  res.json({ ok: true, count: syncedTasks.length })
})

// Remove task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params
  console.log('Remove task request for ID:', id)
  const initialLength = syncedTasks.length
  syncedTasks = syncedTasks.filter(t => (t["Task ID"] || t.taskId || t.id) !== id)

  if (syncedTasks.length < initialLength) {
    saveTasks(syncedTasks)
    res.json({ ok: true, message: `Task ${id} removed` })
  } else {
    res.status(404).json({ error: `Task ${id} not found` })
  }
})

const MESSAGES_FILE = path.join(__dirname, 'messages.json')
let chatMessages = {}

// Load messages from messages.json if exists
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    chatMessages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'))
  }
} catch (err) {
  console.error('Failed to load chat messages:', err)
}

// GET all messages
app.get('/api/messages', (req, res) => {
  res.json(chatMessages)
})

// POST to save message (local or from n8n)
app.post('/api/receive-message', (req, res) => {
  const { chatId, message } = req.body
  if (!chatId || !message) {
    return res.status(400).json({ error: 'Missing chatId or message' })
  }

  const strChatId = String(chatId)
  if (!chatMessages[strChatId]) {
    chatMessages[strChatId] = []
  }

  // Prevent duplicate message IDs
  const exists = chatMessages[strChatId].some(m => String(m.id) === String(message.id))
  if (!exists) {
    chatMessages[strChatId].push(message)
    try {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(chatMessages, null, 2), 'utf8')
      console.log(`Saved message in chat ${strChatId}:`, message)
    } catch (err) {
      console.error('Failed to save chat message to file:', err)
    }
  }

  res.json({ ok: true })
})

app.listen(3001, () => {
  console.log('Dream-Deskk sync server running on port 3001')
})

