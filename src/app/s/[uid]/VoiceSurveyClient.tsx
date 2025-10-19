"use client";

import { VoiceProvider, useVoice } from "@humeai/voice-react";
import { useEffect, useState, useRef } from "react";
import SimpleOrb from "@/components/SimpleOrb";
import FeedbackModal from "@/components/FeedbackModal";
import { extractAudioMetadata, logAudioDiscovery } from "@/utils/audio-metadata-collector";
import { saveAssistantTurnAudio } from "@/lib/turn-audio-service";
// Hybrid audio capture: Assistant (real-time) + User (post-processing)

interface User {
  id: string;
  name: string;
  uid: string;
}

interface VoiceSurveyClientProps {
  uid: string;
  accessToken: string;
  systemPrompt?: string;
  interviewData?: any;
}

function SurveyInterface({ uid, accessToken, systemPrompt, interviewData }: { uid: string; accessToken: string; systemPrompt?: string; interviewData?: any }) {
  const voiceHook = useVoice();
  const { status, connect, disconnect, messages, pauseAssistant, resumeAssistant, chatMetadata } = voiceHook;
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [orbState, setOrbState] = useState<"idle" | "listening" | "speaking" | "connecting">("idle");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Smart deduplication: only save user messages that precede agent responses
  const pendingUserMessageRef = useRef<any>(null);
  const lastProcessedIndexRef = useRef<number>(-1);
  
  // 🎵 Turn-based audio capture (assistant only - user audio via post-processing)
  const currentTurnNumberRef = useRef<number>(0);
  
  // Track if we've saved chat metadata
  const chatMetadataSavedRef = useRef<boolean>(false);

  // 🎯 Save chat metadata when it becomes available
  useEffect(() => {
    if (chatMetadata && sessionId && uid && !chatMetadataSavedRef.current) {
      const chatId = (chatMetadata as any).chatId;
      const chatGroupId = (chatMetadata as any).chatGroupId;
      
      if (!chatId) return; // Wait for chatId to be populated
      
      console.log('🔗 CHAT METADATA AVAILABLE:', chatMetadata);
      
      chatMetadataSavedRef.current = true; // Mark as saved
      
      fetch("/api/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId, 
          userUid: uid,
          chatMetadata: {
            chat_id: chatId,
            chat_group_id: chatGroupId || null,
            hume_session_id: null, // Not available in chatMetadata object
            captured_at: new Date().toISOString()
          },
          turnNumber: 0, // Special turn number for metadata
          message: { type: 'chat_metadata_capture' }
        }),
      })
      .then(response => response.json())
      .then(data => {
        console.log("✅ Chat metadata saved:", data);
      })
      .catch(error => {
        console.error("❌ Chat metadata save error:", error);
        chatMetadataSavedRef.current = false; // Reset on error to retry
      });
    }
  }, [chatMetadata, sessionId, uid]);

  // Load user data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/${uid}`);
        if (res.ok) {
          setUser(await res.json());
        } else {
          // Fallback user
          setUser({ id: uid, name: `User ${uid}`, uid });
        }
      } catch {
        // Fallback user
        setUser({ id: uid, name: `User ${uid}`, uid });
      }
    })();
  }, [uid]);

  // Handle pause/resume functionality
  const handlePause = () => {
    pauseAssistant();
    setIsPaused(true);
    console.log("🔄 EVI responses paused");
  };

  const handleResume = () => {
    resumeAssistant();
    setIsPaused(false);
    console.log("▶️ EVI responses resumed");
  };

  // Start session and save to database
  const startSession = async () => {
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, systemPrompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionId(data.sessionId);
        
        // 🧪 TEST: Connect to Hume normally (chat groups auto-created)
        console.log("🧪 Connecting to Hume - chat groups will be auto-created");
        console.log("🎵 Audio output enabled for turn-based capture");
        connect({
          auth: { type: "accessToken", value: data.accessToken },
          configId: data.configId, // Use app-specific config
        }).then(() => {
          console.log("✅ Connected to Hume successfully");
          console.log("Config ID:", data.configId);
          console.log("📋 Chat group should be auto-created by Hume");
          console.log("Agent should auto-start with on_new_chat event message");
        }).catch((error) => {
          console.error("❌ Failed to connect to Hume:", error);
        });
      } else {
        console.error("Session start failed:", data.error);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  // 🎯 SMART MESSAGE PROCESSING: Only save user messages that precede agent responses
  useEffect(() => {
    if (!sessionId || !messages.length || !uid) return;

    // Process all new messages since last check
    const newMessages = messages.slice(lastProcessedIndexRef.current + 1);
    if (newMessages.length === 0) return;

    console.log(`🔍 Processing ${newMessages.length} new messages...`);

    newMessages.forEach((message, index) => {
      const globalIndex = lastProcessedIndexRef.current + 1 + index;
      const messageContent = (message as any).message?.content || (message as any).transcript?.content;
      
      // 🧪 TEST: Check for audio_output messages
      if ((message as any).type === 'audio_output') {
        console.log('🎵 FOUND AUDIO_OUTPUT MESSAGE:', {
          messageId: (message as any).id,
          hasData: !!(message as any).data,
          mimeType: (message as any).mime_type,
          dataLength: (message as any).data ? (message as any).data.length : 0,
          fullMessage: message
        });
      }

      // 🎯 Chat metadata is now captured via useEffect watching chatId from useVoice()
      
      // 🎵 STEP 1: Collect audio metadata from every message
      const audioMetadata = extractAudioMetadata(message);
      if (audioMetadata) {
        logAudioDiscovery(audioMetadata);
      }
      
      // 🎵 STEP 2: Capture assistant audio from audio_output messages
      if ((message as any).type === 'audio_output' && sessionId) {
        const audioData = (message as any).data;
        if (audioData) {
          // Save assistant audio for current turn
          saveAssistantTurnAudio(
            sessionId,
            currentTurnNumberRef.current,
            audioData
          ).then(result => {
            if (result.success) {
              console.log(`✅ Assistant turn audio saved: turn ${currentTurnNumberRef.current}`);
            } else {
              console.error(`❌ Failed to save assistant audio: ${result.error}`);
            }
          }).catch(err => {
            console.error('❌ Assistant audio save error:', err);
          });
        }
      }
      
      if (!messageContent) return;

      if (message.type === "user_message") {
        // Increment turn number for next assistant response
        currentTurnNumberRef.current += 1;
        
        // Buffer user message - don't save yet
        pendingUserMessageRef.current = {
          message,
          globalIndex,
          turnNumber: globalIndex + 1,
          audioMetadata // Store audio metadata with the message
        };
        console.log(`📝 Buffering user message: "${messageContent.substring(0, 40)}..."`);
        
      } else if (message.type === "assistant_message") {
        // Agent response - now save the pending user message (if any) + this agent message
        
        if (pendingUserMessageRef.current) {
          console.log(`✅ Saving final user message before agent response`);
          saveMessage(pendingUserMessageRef.current.message, pendingUserMessageRef.current.turnNumber, pendingUserMessageRef.current.audioMetadata);
          pendingUserMessageRef.current = null;
        }
        
        console.log(`✅ Saving agent message: "${messageContent.substring(0, 40)}..."`);
        saveMessage(message, globalIndex + 1, audioMetadata);
      }
    });

    lastProcessedIndexRef.current = messages.length - 1;
  }, [messages, sessionId, uid]);

  // Helper function to save messages with optional audio metadata
  const saveMessage = (message: any, turnNumber: number, audioMetadata?: any) => {
    const payload = { 
      sessionId, 
      userUid: uid,
      message: message,
      turnNumber: turnNumber,
      audioMetadata: audioMetadata // Include audio metadata if available
    };

    fetch("/api/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    .then(response => response.json())
    .then(data => {
      console.log("Message saved:", data);
      
      // Log if we saved audio metadata
      if (audioMetadata?.hasAudioData) {
        console.log("🎵 Audio metadata saved with message");
      }
    })
    .catch(error => {
      console.error("Message save error:", error);
    });
  };

  const isConnected = status.value === "connected";
  const isConnecting = status.value === "connecting";

  // Update orb state based on conversation activity
  useEffect(() => {
    const isConnected = status.value === "connected";
    const isConnecting = status.value === "connecting";

    if (isConnecting) {
      setOrbState("connecting");
      return;
    }
    
    if (!isConnected) {
      setOrbState("idle");
      return;
    }

    if (messages.length === 0) {
      setOrbState("idle");
      return;
    }

    // Determine state based on audio activity and messages
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      const isInterim = (lastMessage as any)?.interim;
      
      if (lastMessage.type === "user_message" && isInterim === true) {
        setOrbState("listening");
      } else if (lastMessage.type === "assistant_message" || (lastMessage as any).audio?.data) {
        setOrbState("speaking");
      } else {
        setOrbState("idle");
      }
    }

    // Auto-return to idle after speaking/listening
    const timer = setTimeout(() => {
      setOrbState("idle");
    }, 3000);

    return () => clearTimeout(timer);
  }, [messages, status.value]);

  // Detect when conversation ends naturally (agent concludes)
  useEffect(() => {
    if (!isConnected || messages.length === 0 || surveyCompleted) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === "assistant_message") {
      const content = (lastMessage as any).message?.content?.toLowerCase() || "";
      
      // Check for conversation ending phrases
      const endingPhrases = [
        "thank you for your time",
        "thanks for sharing",
        "that concludes our survey",
        "appreciate your feedback",
        "have a great day",
        "goodbye",
        "bye",
        "that's all for today",
        "thanks for participating"
      ];

      const hasEndingPhrase = endingPhrases.some(phrase => content.includes(phrase));
      
      if (hasEndingPhrase && !surveyCompleted) {
        console.log("🎯 Agent concluded conversation naturally");
        setSurveyCompleted(true); // Prevent multiple calls
        
        // Auto-disconnect after a brief delay
        const timeoutId = setTimeout(async () => {
          // Save any pending user message before completing
          if (pendingUserMessageRef.current) {
            console.log("💾 Saving final pending user message before completion");
            saveMessage(pendingUserMessageRef.current.message, pendingUserMessageRef.current.turnNumber, pendingUserMessageRef.current.audioMetadata);
            pendingUserMessageRef.current = null;
          }
          
          if (sessionId && uid) {
            try {
              await fetch("/api/conversation/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, userUid: uid }),
              });
              console.log("✅ Conversation auto-completed");
            } catch (error) {
              console.error("Error auto-completing conversation:", error);
            }
          }
          
          disconnect();
          setShowFeedbackModal(true);
        }, 3000); // 3 second delay to let user hear the closing

        // Cleanup function to prevent multiple timeouts
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, isConnected, sessionId, uid, surveyCompleted]);

  // Handle feedback submission
  const handleFeedback = async (isPositive: boolean) => {
    try {
      // Save feedback to the database
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId, 
          userUid: uid,
          isPositive,
          timestamp: new Date().toISOString()
        }),
      });
      console.log(`✅ Feedback saved: ${isPositive ? 'Positive' : 'Negative'}`);
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Welcome Message - Only show when not connected */}
      {!isConnected && (
        <div className="text-center mb-12 px-4">
          <p className="text-4xl font-semibold text-gray-700 whitespace-nowrap">
            {user ? `Welcome ${user.name}, your voice matters to us.` : "Loading…"}
          </p>
        </div>
      )}


      {/* Voice Orb Interface */}
      <div className="mt-8 relative z-10">
        <div className="mb-8 text-center">
          <SimpleOrb state={orbState} className="w-96 h-96 mx-auto" />
        </div>
        
        {/* Conversation Transcript */}
        {isConnected && messages.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Conversation</h3>
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const messageContent = (message as any).message?.content || (message as any).transcript?.content;
                  const isUser = message.type === 'user_message';
                  
                  return (
                    <div
                      key={index}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-3xl px-4 py-3 rounded-2xl ${
                          isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${
                            isUser ? 'text-blue-100' : 'text-gray-600'
                          }`}>
                            {isUser ? 'You' : 'AI'}
                          </span>
                        </div>
                        <div className="text-sm leading-relaxed">
                          {messageContent || 'Processing...'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Control Buttons - Only show when connected */}
        {isConnected && (
          <div className="flex flex-col items-center gap-4 mt-12">
            {/* Pause Status Indicator */}
            {isPaused && (
              <div className="text-center">
                <p className="text-lg font-medium text-yellow-600 bg-yellow-100/80 px-4 py-2 rounded-full backdrop-blur-sm">
                  ⏸️ EVI Responses Paused
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  EVI is still listening but won't respond until resumed
                </p>
              </div>
            )}
            
            <div className="flex justify-center items-center gap-6">
            {/* Pause/Resume Button */}
            <button
              onClick={isPaused ? handleResume : handlePause}
              className={`w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl flex items-center justify-center text-2xl backdrop-blur-sm border-0 ${
                isPaused 
                  ? 'bg-green-300/60 hover:bg-green-400/70 text-white' 
                  : 'bg-yellow-300/60 hover:bg-yellow-400/70 text-white'
              }`}
              title={isPaused ? "Resume EVI responses" : "Pause EVI responses"}
            >
              {isPaused ? '▶️' : '⏸️'}
            </button>

            {/* Red Phone End Call Button */}
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Disconnect button clicked!");
                
                // Complete conversation before disconnecting
                if (sessionId && uid) {
                  try {
                    await fetch("/api/conversation/complete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sessionId, userUid: uid }),
                    });
                    console.log("✅ Conversation completed and saved");
                  } catch (error) {
                    console.error("Error completing conversation:", error);
                  }
                }
                
                // Save any pending user message before manual disconnect
                if (pendingUserMessageRef.current) {
                  console.log("💾 Saving pending user message before manual disconnect");
                  saveMessage(pendingUserMessageRef.current.message, pendingUserMessageRef.current.turnNumber, pendingUserMessageRef.current.audioMetadata);
                  pendingUserMessageRef.current = null;
                }
                
                // 🔄 BACK TO SIMPLE DISCONNECT
                disconnect();
                setSurveyCompleted(true);
                setShowFeedbackModal(true);
              }}
              className="w-16 h-16 rounded-full bg-red-300/60 hover:bg-red-400/70 text-white transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl flex items-center justify-center text-2xl backdrop-blur-sm border-0"
              title="End conversation"
            >
              📞
            </button>
            </div>
          </div>
        )}
        
        {/* Start Survey Button - Only show when not connected */}
        {!isConnected && (
          <div className="flex justify-center mt-12">
            <button
              onClick={startSession}
              disabled={!user || isConnecting}
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                !user || isConnecting
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isConnecting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Connecting...
                </>
              ) : (
                <>
                  Start Survey
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onFeedback={handleFeedback}
      />
    </div>
  );
}

export function VoiceSurveyClient({ uid, accessToken, systemPrompt, interviewData }: VoiceSurveyClientProps) {
  return (
    <VoiceProvider
      onError={(error) => {
        console.error("Hume Voice Error:", error);
      }}
    >
      <SurveyInterface uid={uid} accessToken={accessToken} systemPrompt={systemPrompt} interviewData={interviewData} />
    </VoiceProvider>
  );
}
