'use client';

import { useState, useRef, useEffect } from 'react';
import { ConversationResponse, ConversationTurn } from '@/types/responses';
import { formatTimestamp } from '@/utils/dateUtils';
import { downloadResponse } from '@/lib/download-service';

interface ExpandedTranscriptViewProps {
  response: ConversationResponse;
  onClose: () => void;
}

export function ExpandedTranscriptView({ response, onClose }: ExpandedTranscriptViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(response.duration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // Find active turn based on timestamp
      const activeTurn = response.transcript?.find((turn, index) => {
        const nextTurn = response.transcript?.[index + 1];
        return time >= turn.timestamp && (!nextTurn || time < nextTurn.timestamp);
      });
      
      setActiveTurnId(activeTurn?.id || null);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setActualDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveTurnId(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [response.transcript]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlaybackRateChange = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaybackRate(rate);
    audio.playbackRate = rate;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newVolume = parseFloat(e.target.value);
    
    setVolume(newVolume);
    if (audio) {
      audio.volume = newVolume;
    }
  };

  const jumpToTurn = (turn: ConversationTurn) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = turn.timestamp;
    setCurrentTime(turn.timestamp);
  };

  const copyTranscript = async () => {
    if (!response.transcript) return;

    const transcriptText = response.transcript
      .map(turn => `${turn.speaker.toUpperCase()}: ${turn.message}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(transcriptText);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy transcript:', error);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadResponse(response);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Conversation with {response.userName}
            </h3>
            <p className="text-sm text-gray-600">
              {response.turnCount} turns • {formatTimestamp(response.duration)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-white transition-colors"
            >
              Download
            </button>
            
            <button
              onClick={copyTranscript}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-white transition-colors"
            >
              Copy transcript
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-md transition-colors"
              aria-label="Close transcript"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Audio Player */}
        {response.audioUrl && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <audio ref={audioRef} src={response.audioUrl} preload="metadata" />
            
            {/* Controls */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white rounded-full transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono text-gray-600">
                    {formatTimestamp(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-800 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={actualDuration}
                      value={currentTime}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm font-mono text-gray-600">
                    {formatTimestamp(actualDuration)}
                  </span>
                </div>
              </div>

              {/* Playback Speed */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Speed:</label>
                <select
                  value={playbackRate}
                  onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-gray-800"
                  style={{
                    background: `linear-gradient(to right, #1f2937 0%, #1f2937 ${volume * 100}%, #d1d5db ${volume * 100}%, #d1d5db 100%)`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="bg-white rounded-lg border border-gray-200 max-h-96 overflow-y-auto" ref={transcriptRef}>
          {response.transcript && response.transcript.length > 0 ? (
            <div className="p-4 space-y-4">
              {response.transcript.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    activeTurnId === turn.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : turn.speaker === 'user'
                      ? 'bg-gray-50 hover:bg-gray-100'
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                  onClick={() => jumpToTurn(turn)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        turn.speaker === 'user'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}>
                        {turn.speaker === 'user' ? 'User' : 'AI'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {turn.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>{formatTimestamp(turn.timestamp)}</span>
                        {turn.duration && (
                          <>
                            <span>•</span>
                            <span>{formatTimestamp(turn.duration)} duration</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>Transcript not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
