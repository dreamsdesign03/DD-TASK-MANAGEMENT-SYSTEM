import React, { useState } from 'react';
import { useConversation, ConversationProvider } from '@elevenlabs/react';
import { useApp } from '../context/AppContext';

// Helper function for fuzzy matching (Levenshtein distance)
const levenshtein = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

function VoiceBotInner({ onTaskAdd }) {
  const [isActive, setIsActive] = useState(false);
  const { profile, tasks, employees, clients, updateTask } = useApp();

  // Fix stale closures by keeping latest state in refs
  const latestData = React.useRef({ profile, tasks, employees, clients, updateTask, companyList: [] });

  // Derive company list: merge active clients + existing task clients
  React.useEffect(() => {
    const taskClients = tasks ? tasks.map(t => t.client).filter(Boolean) : [];
    const taskUniqueCompanies = [...new Set(taskClients)];
    const activeClientNames = (clients || [])
      .filter(item => {
        const isActive = item['Is Active'] || item['isActive'] || item['is_active'] || item['Is active'] || item.isActive;
        return String(isActive).toLowerCase() === 'yes' || isActive === true;
      })
      .map(item => item['Project Name'] || item['Client Name'] || item['Company Name'] || item['Company'] || item['Name'] || '')
      .filter(Boolean);
    const companyList = [...new Set([...activeClientNames, ...taskUniqueCompanies])].filter(c => c && String(c).toLowerCase() !== 'internal');
    
    latestData.current = { profile, tasks, employees, clients, updateTask, companyList };
  }, [profile, tasks, employees, clients, updateTask]);

  const executeQueryTasks = (params) => {
      console.log("[VoiceBot] executeQueryTasks called with:", params);
      const { tasks, employees, companyList, profile } = latestData.current;
      let filteredTasks = tasks;
      
      // Filter by Task Query (ID or Title)
      if (params.task_query) {
          const taskQuery = params.task_query.trim().toLowerCase();
          let match = tasks.find(t => String(t.id).toLowerCase() === taskQuery);
          if (!match) {
             let bestMatch = null;
             let minDistance = Infinity;
             tasks.forEach(t => {
                 const title = String(t.title).toLowerCase();
                 const dist = levenshtein(taskQuery, title);
                 if (dist < minDistance) { minDistance = dist; bestMatch = t; }
             });
             if (bestMatch && minDistance <= Math.max(taskQuery.length, 10) * 0.6) { match = bestMatch; }
          }
          if (match) {
              filteredTasks = [match];
          } else {
              return `ERROR: Could not find any task matching '${params.task_query}'.`;
          }
      }

      // Filter by Assignee
      if (params.assignee && filteredTasks.length > 0) {
          const assigneeQuery = params.assignee.trim().toLowerCase();
          let matchEmp = null;
          if (assigneeQuery === 'me' || assigneeQuery === 'myself' || assigneeQuery === 'my') {
              matchEmp = { name: profile?.name || 'Mansi Shah' };
          } else {
              matchEmp = employees?.find(e => e.name.toLowerCase() === assigneeQuery);
              if (!matchEmp) {
                 let bestEmp = null;
                 let minEmpDist = Infinity;
                 employees?.forEach(e => {
                     const lowerE = e.name.toLowerCase();
                     const dist = levenshtein(assigneeQuery, lowerE);
                     const distFirst = levenshtein(assigneeQuery, lowerE.split(' ')[0]);
                     const finalDist = Math.min(dist, distFirst);
                     if (finalDist < minEmpDist) { minEmpDist = finalDist; bestEmp = e; }
                 });
                 if (bestEmp && minEmpDist <= Math.max(assigneeQuery.length, 5) * 0.5) { matchEmp = bestEmp; }
              }
          }
          if (!matchEmp) return `ERROR: Could not find any employee named '${params.assignee}'.`;
          filteredTasks = filteredTasks.filter(t => t.assignedTo && t.assignedTo.includes(matchEmp.name));
      }

      // Filter by Client
      if (params.client) {
          const clientQuery = params.client.trim().toLowerCase();
          let matchClient = null;
          let minClientDist = Infinity;
          companyList?.forEach(c => {
              const lowerC = String(c).toLowerCase().replace(/clinic|llc|inc|ltd/g, '').trim();
              const cleanQuery = clientQuery.replace(/clinic|llc|inc|ltd/g, '').trim();
              const dist = levenshtein(cleanQuery, lowerC);
              if (dist < minClientDist) { minClientDist = dist; matchClient = c; }
          });
          if (minClientDist > Math.max(clientQuery.length, 5) * 0.5) matchClient = null;
          
          if (!matchClient) return `ERROR: Could not find any client matching '${params.client}'.`;
          filteredTasks = filteredTasks.filter(t => t.client === matchClient);
      }

      // Filter by Status
      if (params.status) {
          const statusQ = params.status.toLowerCase();
          if (statusQ === 'done' || statusQ === 'completed') {
              filteredTasks = filteredTasks.filter(t => (t.status || '').toLowerCase() === 'done' || (t.status || '').toLowerCase() === 'completed');
          } else if (statusQ === 'pending' || statusQ === 'active') {
              filteredTasks = filteredTasks.filter(t => (t.status || '').toLowerCase() !== 'done' && (t.status || '').toLowerCase() !== 'completed');
          } else {
              filteredTasks = filteredTasks.filter(t => (t.status || '').toLowerCase() === statusQ);
          }
      }

      if (filteredTasks.length === 0) {
          const response = "SYSTEM: There are 0 tasks. Tell the user there are no tasks found.";
          console.log("[VoiceBot] executeQueryTasks returning to AI:", response);
          return response;
      }
      
      const taskNames = filteredTasks.slice(0, 10).map(t => `"${t.title}"`).join(', and ');
      const response = `SYSTEM: The database search is complete. I found ${filteredTasks.length} tasks. You MUST read these exact task titles to the user right now: ${taskNames}`;
      console.log("[VoiceBot] executeQueryTasks returning to AI:", response);
      return response;
  };

  const executeUpdateTask = (params) => {
      console.log("[VoiceBot] executeUpdateTask called with:", params);
      const { tasks, updateTask, employees, profile } = latestData.current;
      const taskQuery = (params.task_query || params.task_name || params.title || '').trim().toLowerCase();
      
      let match = tasks.find(t => String(t.id).toLowerCase() === taskQuery);
      if (!match) {
         let bestMatch = null;
         let minDistance = Infinity;
         tasks.filter(t => t.status !== 'Done').forEach(t => {
             const title = String(t.title).toLowerCase();
             const dist = levenshtein(taskQuery, title);
             if (dist < minDistance) { minDistance = dist; bestMatch = t; }
         });
         if (bestMatch && minDistance <= Math.max(taskQuery.length, 10) * 0.6) { match = bestMatch; }
      }

      if (!match) {
         throw new Error(`I could not find an active task matching '${taskQuery}'. Please ask the user to clarify the task title or ID.`);
      }

      let updates = {};
      let successMessages = [];

      // Update Status
      const newStatus = params.new_status || params.status;
      if (newStatus) {
          updates.status = newStatus;
          successMessages.push(`Status changed to ${newStatus}`);
      }

      // Update Department
      const newDepartment = params.new_department || params.department;
      if (newDepartment) {
          updates.department = newDepartment.toUpperCase();
          successMessages.push(`Department changed to ${newDepartment}`);
      }

      // Update Assignee (Fuzzy Match & Append)
      const addAssigneeStr = params.add_assignee || params.new_assignee || params.assignee;
      if (addAssigneeStr) {
          const assigneeQuery = addAssigneeStr.trim().toLowerCase();
          let empMatch = null;
          if (assigneeQuery === 'me' || assigneeQuery === 'myself' || assigneeQuery === 'my') {
              empMatch = { name: profile?.name || 'Mansi Shah' };
          } else {
              empMatch = employees?.find(e => e.name.toLowerCase() === assigneeQuery);
              if (!empMatch) {
                 let bestEmp = null;
                 let minEmpDist = Infinity;
                 employees?.forEach(e => {
                     const lowerE = e.name.toLowerCase();
                     const dist = levenshtein(assigneeQuery, lowerE);
                     const distFirst = levenshtein(assigneeQuery, lowerE.split(' ')[0]);
                     const finalDist = Math.min(dist, distFirst);
                     if (finalDist < minEmpDist) { minEmpDist = finalDist; bestEmp = e; }
                 });
                 if (bestEmp && minEmpDist <= Math.max(assigneeQuery.length, 5) * 0.5) { empMatch = bestEmp; }
              }
          }

          if (empMatch) {
              const currentAssignees = match.assignedTo ? match.assignedTo.split(',').map(s => s.trim()) : [];
              if (!currentAssignees.includes(empMatch.name)) {
                  currentAssignees.push(empMatch.name);
                  updates.assignedTo = currentAssignees.join(', ');
                  successMessages.push(`Assigned to ${empMatch.name}`);
              } else {
                  successMessages.push(`${empMatch.name} is already assigned`);
              }
          } else {
              throw new Error(`I found the task, but I could not find any employee named '${params.add_assignee}'.`);
          }
      }

      // Remove Assignee (Fuzzy Match & Remove)
      if (params.remove_assignee) {
          const assigneeQuery = params.remove_assignee.trim().toLowerCase();
          let empMatch = null;
          if (assigneeQuery === 'me' || assigneeQuery === 'myself' || assigneeQuery === 'my') {
              empMatch = { name: profile?.name || 'Mansi Shah' };
          } else {
              empMatch = employees?.find(e => e.name.toLowerCase() === assigneeQuery);
              if (!empMatch) {
                 let bestEmp = null;
                 let minEmpDist = Infinity;
                 employees?.forEach(e => {
                     const lowerE = e.name.toLowerCase();
                     const dist = levenshtein(assigneeQuery, lowerE);
                     const distFirst = levenshtein(assigneeQuery, lowerE.split(' ')[0]);
                     const finalDist = Math.min(dist, distFirst);
                     if (finalDist < minEmpDist) { minEmpDist = finalDist; bestEmp = e; }
                 });
                 if (bestEmp && minEmpDist <= Math.max(assigneeQuery.length, 5) * 0.5) { empMatch = bestEmp; }
              }
          }

          if (empMatch) {
              let currentAssignees = match.assignedTo ? match.assignedTo.split(',').map(s => s.trim()) : [];
              if (currentAssignees.includes(empMatch.name)) {
                  currentAssignees = currentAssignees.filter(name => name !== empMatch.name);
                  updates.assignedTo = currentAssignees.join(', ') || 'Unassigned';
                  successMessages.push(`Removed ${empMatch.name} from task`);
              } else {
                  successMessages.push(`${empMatch.name} is not assigned to this task`);
              }
          } else {
              throw new Error(`I found the task, but I could not find any employee named '${params.remove_assignee}'.`);
          }
      }

      if (Object.keys(updates).length > 0) {
         updateTask(match.id, updates);
         return `SUCCESS: Task '${match.title}' (${match.id}) updated. ${successMessages.join(' | ')}.`;
      } else {
         return `ERROR: You did not provide any fields to update for task '${match.title}'.`;
      }
  };

  const conversation = useConversation({
    onConnect: () => {
      setIsActive(true);
    },
    onDisconnect: () => {
      setIsActive(false);
    },
    onMessage: (message) => {
      console.log('AI Message:', message);
    },
    onError: (error) => {
      console.error('AI Error:', error);
      setIsActive(false);
    },
    clientTools: {
      get_team_status: () => {
        const { employees } = latestData.current;
        const online = employees.filter(e => e.status === 'Online').map(e => e.name);
        return `Currently Online Team Members: ${online.join(', ') || 'No one'}. Offline Members: ${employees.filter(e => e.status !== 'Online').map(e => e.name).join(', ') || 'No one'}.`;
      },

      get_employee_tasks: (params) => {
        // Alias for older configurations
        return executeQueryTasks({ ...params, assignee: params.employee_name || params.assignee });
      },

      task_query: (params) => {
        // Alias because the user created this as a separate tool
        return executeQueryTasks(params);
      },

      query_tasks: (params) => {
        return executeQueryTasks(params);
      },

      update_task: (params) => {
        return executeUpdateTask(params);
      },

      update_task_status: (params) => {
        return executeUpdateTask(params);
      },

      add_task: (params) => {
        console.log("Adding task via VoiceBot", params);
        
        const { employees, companyList, tasks, profile } = latestData.current;

        // Client Validation & Fuzzy Matching
        const providedClient = (params.client || '').trim();
        let validClientName = companyList?.[0] || 'General';

        if (providedClient) {
          const lowerProvided = providedClient.toLowerCase();
          // Try exact match first
          let match = companyList?.find(c => c.toLowerCase() === lowerProvided);
          
          // Try advanced fuzzy match if exact fails
          if (!match) {
             console.log("[VoiceBot] Exact client match failed. Starting fuzzy match...");
             const ignoreWords = ['clinic', 'hospital', 'inc', 'llc', 'co', 'the', 'private', 'ltd'];
             const providedWords = lowerProvided.split(' ').filter(w => !ignoreWords.includes(w) && w.length > 1);
             console.log("[VoiceBot] Client provided words after ignoring common words:", providedWords);
             console.log("[VoiceBot] Available companyList:", companyList);
             
             if (providedWords.length > 0) {
                 const possibleMatches = companyList?.filter(c => {
                     const cWords = c.toLowerCase().split(' ');
                     // Check if ANY meaningful provided word matches ANY company word with <= 2 typos
                     const hasMatch = providedWords.some(pw => cWords.some(cw => {
                         const dist = levenshtein(pw, cw);
                         // Match if levenshtein distance is small, OR if one word contains the other (e.g. 'tiny' in 'tinybit')
                         return dist <= 2 || cw.includes(pw) || pw.includes(cw);
                     }));
                     return hasMatch;
                 });

                 console.log("[VoiceBot] Possible Client Matches found:", possibleMatches);

                 // If we narrowed it down to exactly one company, we found it!
                 if (possibleMatches && possibleMatches.length === 1) {
                     match = possibleMatches[0];
                 } else if (possibleMatches && possibleMatches.length > 1) {
                     // If multiple companies share this word, find the one with the smallest total distance
                     let bestMatch = null;
                     let minDistance = Infinity;
                     possibleMatches.forEach(c => {
                         const dist = levenshtein(lowerProvided, c.toLowerCase());
                         if (dist < minDistance) {
                             minDistance = dist;
                             bestMatch = c;
                         }
                     });
                     if (bestMatch) match = bestMatch;
                 }
             }
          }

          if (match) {
            console.log(`[VoiceBot] SUCCESS: Fuzzy matched client to: "${match}"`);
            validClientName = match;
          } else {
             throw new Error(`I could not create the task because the client '${providedClient}' does not exist in our system. Please ask the user for the correct client name.`);
          }
        }

        // Calculate next ID
        let maxIdNum = 0;
        if (tasks && tasks.length > 0) {
          tasks.forEach(t => {
            if (t.id && (!t.taskType || t.taskType === 'Main Task' || t.taskType === 'Task') && String(t.id).match(/^T-\d+$/)) {
              const match = String(t.id).match(/^T-(\d+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxIdNum) maxIdNum = num;
              }
            }
          });
        }
        const nextIdNum = maxIdNum > 0 ? maxIdNum + 1 : 1;
        const nextIdStr = `T-${String(nextIdNum).padStart(4, '0')}`;

        // Get Assignees with Validation & Fuzzy Matching
        const rawAssignee = params.assignee;
        let validAssigneeNames = [];
        let assignedEmps = [];

        if (rawAssignee && rawAssignee.toLowerCase() !== 'unassigned') {
          const namesToMatch = rawAssignee.split(',').map(s => s.trim().toLowerCase());
          const validEmployeeNames = employees?.map(e => e.name) || [];
          
          for (const name of namesToMatch) {
             let match = null;
             if (name === 'me' || name === 'myself' || name === 'my') {
                 match = { name: profile?.name || 'Mansi Shah' };
             } else {
                 match = employees?.find(e => e.name.toLowerCase() === name);
                 if (!match) {
                    console.log(`[VoiceBot] Exact assignee match failed for "${name}". Starting fuzzy match...`);
                    let bestMatch = null;
                    let minDistance = Infinity;
                    employees?.forEach(e => {
                        const lowerE = e.name.toLowerCase();
                        const dist = levenshtein(name, lowerE);
                        // Check against just the first name for better matching ("Tomansisha" -> "Mansi Shah" won't match well, but "Mansisha" -> "Mansi" will)
                        const firstName = lowerE.split(' ')[0];
                        const distFirst = levenshtein(name, firstName);
                        const finalDist = Math.min(dist, distFirst);
                        
                        if (finalDist < minDistance) {
                            minDistance = finalDist;
                            bestMatch = e;
                        }
                    });
                    console.log(`[VoiceBot] Best fuzzy match for "${name}" is "${bestMatch?.name}" with distance ${minDistance}`);
                    // If distance is less than 50% of length, accept it
                    if (bestMatch && minDistance <= Math.max(name.length, 5) * 0.5) {
                       console.log(`[VoiceBot] Distance ${minDistance} is acceptable. Using "${bestMatch.name}".`);
                       match = bestMatch;
                    } else {
                       console.log(`[VoiceBot] Distance ${minDistance} is TOO HIGH. Match rejected.`);
                    }
                 }
             }

             if (match) {
                validAssigneeNames.push(match.name);
                assignedEmps.push(match);
             } else {
                throw new Error(`I could not create the task because I could not find any employee named '${name}'. Please ask the user to clarify the employee's name.`);
             }
          }
        } else {
          validAssigneeNames.push(profile?.name || 'Unassigned');
        }

        const assigneeString = validAssigneeNames.join(', ');

        // Format Date
        let formattedDate = '';
        if (params.deadline) {
           try {
             formattedDate = new Date(params.deadline).toLocaleDateString('en-US', {
               month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata'
             });
           } catch(e) {}
        }

        const newTask = {
          id: nextIdStr,
          title: (params.title || 'Voice Task').trim(),
          client: validClientName,
          project: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }),
          assigned: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }),
          assignedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }),
          dueDate: formattedDate,
          priority: params.priority || 'Medium',
          status: 'Pending',
          statusUpdatedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }),
          overdue: false,
          done: false,
          department: params.department || 'COMMON',
          assignedTo: assigneeString,
          assignedBy: profile?.name || 'System',
          employeeId: assignedEmps.map(e => e.id).filter(Boolean).join(', '),
          assignedEmail: assignedEmps.map(e => e.email).filter(Boolean).join(', '),
          description: {
            intro: (params.description || '').trim() || 'Added via Voice Assistant.',
            bullets: [],
            outro: '',
          },
          comments: [],
          attachments: [],
          remarks: params.remarks || '',
          post: 'YES',
          isRecurring: false,
          recurringSchedule: '',
          recurringDay: '',
          recurringMonths: '',
        };

        if (onTaskAdd) {
          onTaskAdd(newTask);
        }
        return "Task successfully added to the system.";
      }
    }
  });

  const toggleConversation = async () => {
    if (isActive) {
      await conversation.endSession();
    } else {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'your-elevenlabs-agent-id';
      
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        console.error("Microphone Error:", micErr);
        alert("Microphone Error: " + micErr.message + ". Please allow microphone access in your browser settings.");
        return;
      }

      try {
        await conversation.startSession({
          agentId: agentId
        });
      } catch (agentErr) {
        console.error("ElevenLabs Error:", agentErr);
        alert("ElevenLabs Error: " + agentErr.message + ". Check if the Agent ID is correct and if the Agent is public.");
      }
    }
  };

  return (
    <div
      onClick={toggleConversation}
      className={`rounded-full flex items-center justify-center cursor-pointer shadow-sm overflow-hidden whitespace-nowrap transition-all`}
      style={{
        height: 44,
        width: isActive ? 'auto' : 44,
        minWidth: 44,
        background: isActive ? '#ef4444' : '#F9F4FB', // Red if active (recording), Purple-ish if inactive
        color: isActive ? 'white' : '#702c91',
        boxShadow: isActive ? '0 4px 20px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(91,33,182,0.06)',
        padding: isActive ? '0 16px 0 12px' : '0',
        gap: isActive ? '8px' : '0',
      }}
      title="Voice AI Assistant"
    >
      {isActive ? (
        <div className="flex items-center gap-2">
          {/* Animated pulsing dot for recording */}
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="material-symbols-outlined text-[20px]">mic_off</span>
          <span className="font-bold text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Stop Listening</span>
        </div>
      ) : (
        <span className="material-symbols-outlined text-[20px]">mic</span>
      )}
    </div>
  );
}

export default function VoiceBot(props) {
  return (
    <ConversationProvider>
      <VoiceBotInner {...props} />
    </ConversationProvider>
  );
}
