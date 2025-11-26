import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveServerMessage, Modality } from '@google/genai';
import { createGeminiClient, createAudioBlob, generateMeetingSummary, MODELS } from '../services/gemini';
import { saveSession } from '../services/storage';
import { Session } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Mic, Square, Pause, Play, Monitor, AlertCircle, Loader2, Key } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const ActiveSession: React.FC = () => {
  const navigate = useNavigate();
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'initializing' | 'recording' | 'paused' | 'processing' | 'error'>('idle');
  const [sourceType, setSourceType] = useState<'mic' | 'tab'>('mic');
  const [transcript, setTranscript] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsKeySelection, setNeedsKeySelection] = useState(false);

  // Refs for logic
  const sessionRef = useRef<any>(null); // Gemini Live Session
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const transcriptRef = useRef<string>(''); // Mutable ref for instant updates
  const nextStartTimeRef = useRef<number>(0); // For audio playback if we wanted it, mostly unused here

  // Check for API Key selection availability (for specific environments)
  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio) {
        try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            setNeedsKeySelection(true);
          }
        } catch (e) {
          console.error("Error checking for selected API key", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setNeedsKeySelection(false);
        // Reset error state if it was related to key
        if (errorMsg?.includes("API Key")) {
            setErrorMsg(null);
        }
      } catch (e) {
        console.error("Error opening key selector", e);
      }
    }
  };

  // Start Session Logic
  const startSession = async () => {
    try {
      setStatus('initializing');
      setErrorMsg(null);
      setTranscript('');
      transcriptRef.current = '';
      setDuration(0);

      // Check if we need to select a key first (and haven't yet)
      if (needsKeySelection) {
        throw new Error("Please select an API Key to continue.");
      }

      // 1. Get Media Stream
      let stream: MediaStream;
      if (sourceType === 'tab') {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true, // Required for getDisplayMedia to return audio in some browsers
            audio: {
              // For tab sharing (meeting audio), we want the raw output.
              // Echo cancellation and noise suppression often cut out voices in high-quality meeting streams.
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          });
        } catch (err: any) {
           if (err.name === 'NotAllowedError') {
             throw new Error("Permission denied. You must select a tab/screen to share.");
           }
           throw err;
        }

        // CRITICAL CHECK: Ensure audio track exists
        if (stream.getAudioTracks().length === 0) {
            // Clean up the video track immediately since we can't use it
            stream.getTracks().forEach(t => t.stop());
            throw new Error("No audio captured. Please ensure you check the 'Share tab audio' box in the browser dialog.");
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
          }
        });
      }
      mediaStreamRef.current = stream;

      // 2. Connect to Gemini Live API
      // Initialize client here to ensure we pick up the latest env var
      const ai = createGeminiClient();

      // We use a promise wrapper to ensure we have the session before sending data
      const connectPromise = ai.live.connect({
        model: MODELS.LIVE_AUDIO,
        config: {
          responseModalities: [Modality.AUDIO], // We must accept audio to get the connection
          inputAudioTranscription: {}, // Enable transcription for input
          // Updated instruction to handle Hindi and other languages explicitly
          systemInstruction: "You are a professional audio transcriber. Your only task is to transcribe the user's speech exactly as spoken.\n" +
            "1. Accurately detect the language (English, Hindi, Hinglish, etc.).\n" +
            "2. Handle code-switching naturally (e.g. Hindi sentences with English words).\n" +
            "3. Do not translate. Transcribe in the original language.\n" +
            "4. Do not provide conversational responses or talk back. Only output the transcription.",
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
            setStatus('recording');
            startTimer();
          },
          onmessage: (msg: LiveServerMessage) => {
            // Handle Transcription
            if (msg.serverContent?.inputTranscription) {
               const text = msg.serverContent.inputTranscription.text;
               if (text) {
                 transcriptRef.current += text;
                 setTranscript(prev => prev + text);
               }
            }
            
            // Handle turn complete (optional, just logging)
            if (msg.serverContent?.turnComplete) {
               // console.log('Turn complete');
            }
          },
          onclose: () => {
            console.log('Gemini Live Connection Closed');
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            // The Live API might throw error events that are generic objects
            setErrorMsg("Connection to AI service failed. Please check your network and API key.");
            stopRecording(true);
          }
        }
      });
      
      sessionRef.current = connectPromise;

      // 3. Setup Audio Processing Pipeline
      // We need to downsample to 16kHz if not already. 
      // Note: If using getDisplayMedia, the browser might ignore sampleRate: 16000 and give 48000.
      // createMediaStreamSource usually handles resampling when connected to this context.
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Use ScriptProcessor for wide compatibility with the simplified createBlob example
      // In production, AudioWorklet is preferred
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (status === 'paused') return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Create PCM blob
        const pcmData = createAudioBlob(inputData);
        
        // Send to Gemini
        connectPromise.then((session) => {
            session.sendRealtimeInput({
                media: pcmData
            });
        });
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); // Connect to destination to keep processor alive

      // Handle stream end (e.g. user stops sharing tab)
      // For Tab sharing, usually the video track ends when user clicks "Stop Sharing"
      const trackToMonitor = stream.getVideoTracks()[0] || stream.getAudioTracks()[0];
      if (trackToMonitor) {
        trackToMonitor.addEventListener('ended', () => {
            console.log("Track ended, stopping recording");
            // Only stop if we are currently recording or paused (not already processing)
            if (statusRef.current === 'recording' || statusRef.current === 'paused') {
                stopRecording();
            }
        });
      }

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      // Improve error message for common tab sharing mistake
      if (err.message && err.message.includes("No audio track found")) {
         setErrorMsg(err.message);
      } else if (err.message && err.message.includes("API Key is missing")) {
         setErrorMsg("API Key is missing. Please set the API_KEY environment variable in your deployment settings.");
      } else {
         setErrorMsg(err.message || "Failed to access microphone or screen share.");
      }
    }
  };

  // Helper ref to access status inside event listeners
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const togglePause = () => {
    if (status === 'recording') {
      setStatus('paused');
      stopTimer();
      // We don't close the connection, just stop sending data in onaudioprocess
    } else if (status === 'paused') {
      setStatus('recording');
      startTimer();
    }
  };

  const stopRecording = async (isError = false) => {
    stopTimer();
    
    // Cleanup Audio
    if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());

    // Cleanup Session
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => {
            // connection naturally closes when we stop sending or component unmounts
        });
    }

    if (isError) {
        setStatus('error');
        return;
    }

    setStatus('processing');
    
    // Finalize
    const finalTranscript = transcriptRef.current;
    
    if (!finalTranscript.trim()) {
        // No audio captured
        setStatus('idle');
        return;
    }

    // Generate Summary
    try {
        let summaryData = null;
        try {
            summaryData = await generateMeetingSummary(finalTranscript);
        } catch (e) {
            console.error("Summary generation failed", e);
            // Continue without summary
        }

        const newSession: Session = {
            id: uuidv4(),
            title: summaryData?.summary ? summaryData.summary.substring(0, 50) + "..." : "Untitled Session",
            createdAt: new Date().toISOString(),
            durationSeconds: duration,
            transcript: finalTranscript,
            summary: summaryData ? JSON.stringify(summaryData) : null,
            status: 'completed',
            source: sourceType
        };

        saveSession(newSession);
        navigate(`/session/${newSession.id}`);
    } catch (e) {
        console.error("Finalization error", e);
        setStatus('error');
        setErrorMsg("Failed to save session.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        stopTimer();
        if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Render Idle State (Dashboard/Start)
  if (status === 'idle' || status === 'error') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-surface rounded-2xl border border-white/10 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-white">Start New Session</h2>
        
        {status === 'error' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="flex-shrink-0" />
                <p>{errorMsg}</p>
            </div>
        )}

        {needsKeySelection && (
             <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                    <Key size={20} />
                    <p>API Key Required</p>
                </div>
                <button 
                    onClick={handleSelectKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    Select API Key
                </button>
             </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
            <button
                onClick={() => setSourceType('mic')}
                className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                    sourceType === 'mic' 
                    ? 'border-primary bg-primary/10 text-white' 
                    : 'border-white/10 bg-white/5 text-secondary hover:bg-white/10'
                }`}
            >
                <Mic size={32} />
                <span className="font-semibold">Microphone</span>
            </button>
            <button
                onClick={() => setSourceType('tab')}
                className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                    sourceType === 'tab' 
                    ? 'border-primary bg-primary/10 text-white' 
                    : 'border-white/10 bg-white/5 text-secondary hover:bg-white/10'
                }`}
            >
                <Monitor size={32} />
                <span className="font-semibold">Share Tab</span>
            </button>
        </div>

        <div className="bg-blue-500/10 p-4 rounded-lg text-sm text-blue-200 mb-6">
            <p className="font-semibold mb-1">💡 Pro Tip:</p>
            {sourceType === 'tab' 
                ? "Select the specific Chrome Tab you want to record. Make sure to check 'Share tab audio' in the popup." 
                : "Best for in-person meetings. Ensure you are in a quiet environment."}
        </div>

        <button
            onClick={startSession}
            className="w-full py-4 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
        >
            Start Scribing
        </button>
      </div>
    );
  }

  // Render Processing State
  if (status === 'processing' || status === 'initializing') {
      return (
          <div className="flex flex-col items-center justify-center h-96">
              <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">
                  {status === 'initializing' ? 'Connecting to Gemini...' : 'Finalizing Session...'}
              </h2>
              <p className="text-secondary">
                  {status === 'initializing' ? 'Prepare your audio source.' : 'Generating AI summary and action items.'}
              </p>
          </div>
      );
  }

  // Render Recording State
  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header / Controls */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 mb-4 flex items-center justify-between shadow-lg relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-red-500/5 transition-opacity ${status === 'recording' ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className="relative z-10 flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                <div>
                    <h2 className="text-xl font-bold text-white">{status === 'recording' ? 'Recording Live' : 'Session Paused'}</h2>
                    <p className="text-secondary font-mono">{formatTime(duration)}</p>
                </div>
            </div>

            <div className="relative z-10 w-1/3 h-12">
                <AudioVisualizer stream={mediaStreamRef.current} isRecording={status === 'recording'} color={status === 'recording' ? '#ef4444' : '#fbbf24'} />
            </div>

            <div className="relative z-10 flex items-center gap-3">
                <button 
                    onClick={togglePause}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title={status === 'recording' ? 'Pause' : 'Resume'}
                >
                    {status === 'recording' ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button 
                    onClick={() => stopRecording()}
                    className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                    title="Stop & Save"
                >
                    <Square size={24} />
                </button>
            </div>
        </div>

        {/* Live Transcript Area */}
        <div className="flex-1 bg-surface border border-white/10 rounded-2xl p-6 overflow-y-auto relative">
             <div className="absolute top-4 right-4 text-xs text-primary font-mono bg-primary/10 px-2 py-1 rounded">
                 GEMINI LIVE • {sourceType === 'tab' ? 'TAB AUDIO' : 'MIC'}
             </div>
             {transcript ? (
                 <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">
                     {transcript}
                     <span className="inline-block w-2 h-5 ml-1 bg-primary animate-pulse align-middle"></span>
                 </div>
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-secondary opacity-50">
                     <p>Listening for speech (English, Hindi, etc)...</p>
                 </div>
             )}
        </div>
    </div>
  );
};

export default ActiveSession;