import React, { useState } from 'react';
import { useConversation, ConversationProvider } from '@elevenlabs/react';
import { useApp } from '../context/AppContext';

function VoiceBotInner({ onTaskAdd }) {
  const [isActive, setIsActive] = useState(false);
  const { profile, tasks, employees, companyList } = useApp();

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
      add_task: (params) => {
        console.log("Adding task via VoiceBot", params);
        
        // Client Validation
        const providedClient = (params.client || '').trim();
        let validClientName = companyList?.[0] || 'General';

        if (providedClient) {
          const match = companyList?.find(c => c.toLowerCase() === providedClient.toLowerCase());
          if (match) {
            validClientName = match;
          } else if (providedClient.toLowerCase() !== 'general') {
            return `ERROR: The client '${providedClient}' does not exist in the system. Tell the user they must select an existing client. Here are the valid clients: ${companyList?.join(', ') || 'None'}. Ask them which one they meant.`;
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
             // Try exact match first
             let match = employees?.find(e => e.name.toLowerCase() === name);
             
             // If no exact match, try partial match (e.g. "Mansi" matching "Mansi Shah")
             if (!match) {
                const partialMatches = employees?.filter(e => e.name.toLowerCase().includes(name));
                if (partialMatches && partialMatches.length === 1) {
                   match = partialMatches[0];
                }
             }

             if (match) {
                validAssigneeNames.push(match.name);
                assignedEmps.push(match);
             } else {
                return `ERROR: The employee '${name}' does not exist or is ambiguous. Please politely ask the user to clarify the assignee from this list: ${validEmployeeNames.join(', ')}.`;
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
