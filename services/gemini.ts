import { GoogleGenAI, Type } from '@google/genai';

// Initialize the Gemini SDK
// Note: In a real production app, this key should be proxied or users should enter their own.
// For this environment, we assume process.env.API_KEY is available or use the provided fallback.

const FALLBACK_KEY = 'AIzaSyBZA1rOSR3KFppFkfZ7zGEVAn5OYKt1LoA';

export const createGeminiClient = () => {
  let key = '';
  try {
    // Safely access process.env to avoid "process is not defined" in browser runtimes without polyfills
    key = process.env.API_KEY || '';
  } catch (e) {
    // Ignore error if process is not defined
  }

  // Use fallback key if environment variable is not set
  if (!key) {
    key = FALLBACK_KEY;
  }

  if (!key) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable in your deployment settings.");
  }

  return new GoogleGenAI({ apiKey: key });
}

export const MODELS = {
  LIVE_AUDIO: 'gemini-2.5-flash-native-audio-preview-09-2025',
  SUMMARY: 'gemini-2.5-flash',
};

// Helper for PCM encoding
export function encodePCM(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to create the blob payload for Live API
export function createAudioBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
  }
  return {
    data: encodePCM(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const generateMeetingSummary = async (transcript: string) => {
  const ai = createGeminiClient();
  
  const prompt = `
    You are an expert executive assistant. Summarize the following meeting transcript.
    The transcript may be in English, Hindi, or a mix of languages.
    
    Transcript:
    "${transcript}"
    
    Output JSON with the following structure (keep the summary in the primary language of the transcript or English if preferred for business):
    {
      "summary": "A concise paragraph summarizing the meeting.",
      "keyPoints": ["Point 1", "Point 2"],
      "actionItems": ["Action 1", "Action 2"]
    }
  `;

  const response = await ai.models.generateContent({
    model: MODELS.SUMMARY,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['summary', 'keyPoints', 'actionItems'],
      },
    },
  });

  return response.text ? JSON.parse(response.text) : null;
};