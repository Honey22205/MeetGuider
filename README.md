# 🎙️ ScribeAI - The Future of Meeting Intelligence

![ScribeAI Banner](https://img.shields.io/badge/AI-Powered-blue?style=for-the-badge) ![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react) ![Gemini](https://img.shields.io/badge/Gemini-2.5-8E75B2?style=for-the-badge&logo=google)

> **Transform your meetings into actionable insights instantly.**  
> *Created by Honey Priya* 👩‍💻

---

## 🚀 Overview

**ScribeAI** is a cutting-edge, real-time audio scribing application designed to revolutionize how we capture and process meetings. Powered by **Google's Gemini 2.5 Flash** models, it seamlessly transcribes audio from your microphone or browser tabs and generates intelligent, structured summaries with zero lag.

Whether you are in a boardroom, a classroom, or a remote brainstorming session, ScribeAI ensures you never miss a beat.

## ✨ Key Features

*   **🎧 Real-Time Transcription**: Watch your conversation turn into text instantly using the low-latency Gemini Live API.
*   **🌐 Multi-Language Support**: Effortlessly handles English, Hindi, and Hinglish code-switching.
*   **🖥️ Tab Audio Capture**: High-fidelity audio capture directly from Chrome tabs (Google Meet, Zoom, YouTube) for crystal clear remote meeting transcription.
*   **🧠 Intelligent Summaries**: Automatically generates concise summaries, key bullet points, and actionable to-do lists once the session ends.
*   **📊 Audio Visualization**: Beautiful, real-time frequency visualization of your audio stream.
*   **💾 Local Persistence**: Your sessions are saved locally in your browser, keeping your data private and accessible.

## 🛠️ Tech Stack

*   **Frontend**: React 18 with TypeScript
*   **Styling**: Tailwind CSS for a sleek, dark-mode first UI
*   **AI Core**: Google GenAI SDK (`@google/genai`)
    *   *Live API*: `gemini-2.5-flash-native-audio-preview` for streaming transcription.
    *   *Generation*: `gemini-2.5-flash` for post-session summarization.
*   **Audio Processing**: Web Audio API (ScriptProcessor & AnalyserNode)
*   **Routing**: React Router DOM

## 🏁 Getting Started

1.  **Clone the repository**
2.  **Install dependencies**: `npm install`
3.  **Run locally**: `npm run dev`
4.  **Start Scribing!** Click "New Session" and choose between Microphone or Tab Sharing.

---

### 🌟 About the Creator

**Honey Priya** is a visionary developer passionate about leveraging Artificial Intelligence to solve real-world productivity challenges. ScribeAI is a testament to the power of modern web technologies combined with state-of-the-art Generative AI.

---

*Built with ❤️ and ☕ by Honey Priya.*