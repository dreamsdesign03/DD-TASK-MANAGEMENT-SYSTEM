import React, { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useApp } from '../context/AppContext';

export default function VoiceBot({ onTaskAdd }) {
  const [isActive, setIsActive] = useState(false);
  const { profile } = useApp();

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
        // Map the parameters extracted by AI to the actual task creation logic
        if (onTaskAdd) {
          onTaskAdd({
            title: params.title || 'Voice Task',
            description: params.description || '',
            projectName: params.projectName || 'Internal',
            assignee: params.assignee || profile?.name || 'Unassigned',
            priority: params.priority || 'Medium',
            deadline: params.deadline || new Date().toISOString().split('T')[0]
          });
        }
        return "Task successfully added to the system.";
      }
    }
  });

  const toggleConversation = async () => {
    if (isActive) {
      await conversation.endSession();
    } else {
      // Use the provided Agent ID or a placeholder if env var isn't set
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'your-elevenlabs-agent-id';
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await conversation.startSession({
          agentId: agentId
        });
      } catch (err) {
        console.error("Failed to start conversation:", err);
        alert("Microphone access is required or agent ID is invalid.");
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
