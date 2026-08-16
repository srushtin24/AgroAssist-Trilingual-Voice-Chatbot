import { useState, useRef, useEffect } from "react";
import "./ChatBot.css";

// ─────────────────────────────────────────────────────────────
// CHANGE THIS to your deployed Railway/Render backend URL
// Example: "https://agroassist-backend.up.railway.app/api/chat"
// For local testing keep it as: "http://127.0.0.1:8000/api/chat"
// ─────────────────────────────────────────────────────────────
const API_URL = "lucid-enjoyment-production-6df9.up.railway.app/api/chat";

const VOICE_OUTPUT_ENABLED = true;

const LANG_CODES = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

const PLACEHOLDERS = {
  en: "Ask about plants or tap mic...",
  hi: "पौधों के बारे में पूछें...",
  mr: "झाडांबद्दल विचारा...",
};

const LISTENING_TEXT = {
  en: "Listening... speak now",
  hi: "सुन रहा हूँ... बोलिए",
  mr: "ऐकत आहे... बोला",
};

function getSessionId() {
  let id = sessionStorage.getItem("agro_session_id");
  if (!id) {
    id = "sess_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    sessionStorage.setItem("agro_session_id", id);
  }
  return id;
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/>\s/g, "")
    .replace(/[-*+]\s/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const INITIAL_MESSAGES = [
  {
    role: "bot",
    text: "Hi! I am AgroAssist ChatBot.\nAsk me anything about plant diseases, remedies, fertilizers, or farming tips.\n\n👉 Please select your language from the top-right corner before starting.",
  },
  {
    role: "bot",
    text: "नमस्ते! मैं एग्रोअसिस्ट चैटबॉट हूँ।\nआप मुझसे पौधों की बीमारियों, उपचार, उर्वरकों या खेती से जुड़े सुझावों के बारे में कुछ भी पूछ सकते हैं।\n\n👉 कृपया बातचीत शुरू करने से पहले ऊपर दाईं ओर से अपनी पसंद की भाषा चुनें।",
  },
  {
    role: "bot",
    text: "नमस्कार! मी ॲग्रोअसिस्ट चॅटबॉट आहे.\nतुम्ही मला पिकांच्या आजारांबद्दल, उपाययोजना, खतं किंवा शेतीसंबंधित सल्ला विचारू शकता.\n\n👉 कृपया संभाषण सुरू करण्यापूर्वी वरच्या उजव्या कोपऱ्यातून तुमची पसंतीची भाषा निवडा.",
  },
];

export default function ChatBot() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState(INITIAL_MESSAGES);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const [listening, setListening] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");

  const bottomRef    = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // preload voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis.onvoiceschanged = () =>
      window.speechSynthesis.getVoices();
  }, []);

  function handleSetLang(lang) {
    setCurrentLang(lang);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function speakText(text, lang) {
    if (!VOICE_OUTPUT_ENABLED) return;
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    let langCode = LANG_CODES[lang] || "en-IN";
    if (lang === "mr") langCode = "hi-IN"; // fallback for Marathi voice

    const utterance  = new SpeechSynthesisUtterance(text);
    utterance.lang   = langCode;
    utterance.rate   = 0.95;
    utterance.pitch  = 1.0;

    const voices    = window.speechSynthesis.getVoices();
    const baseLang  = langCode.split("-")[0];
    const matched   =
      voices.find((v) => v.lang === langCode) ||
      voices.find((v) => v.lang.startsWith(baseLang));
    if (matched) utterance.voice = matched;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function toggleVoiceInput() {
    if (!("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)) {
      alert("Voice input not supported. Please use Chrome or Edge.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const rec            = new SpeechRecognition();
    rec.lang             = LANG_CODES[currentLang];
    rec.interimResults   = true;
    rec.continuous       = false;
    recognitionRef.current = rec;

    rec.onstart = () => setListening(true);

    rec.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    rec.onend = () => {
      setListening(false);
      // auto-send handled by useEffect below
    };

    rec.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") {
        alert("Microphone permission denied. Please allow mic access.");
      } else if (event.error !== "no-speech") {
        console.warn("Voice error:", event.error);
      }
    };

    rec.start();
  }

  // auto-send after mic stops if there is input
  useEffect(() => {
    if (!listening && input.trim()) {
      // small delay to let state settle
      const t = setTimeout(() => {
        if (input.trim()) sendMessage();
      }, 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    window.speechSynthesis?.cancel();
    setSpeaking(false);

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: getSessionId(),
          message: text,
          lang: currentLang,
        }),
      });

      if (!res.ok) throw new Error("Server returned " + res.status);

      const data       = await res.json();
      const cleanReply = stripMarkdown(data.reply);

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: cleanReply, sources: data.sources },
      ]);
      speakText(cleanReply, currentLang);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry, could not connect to the server. Make sure the backend is running.",
        },
      ]);
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Bubble button ── */}
      <div
        id="chat-bubble"
        onClick={() => setOpen((o) => !o)}
        title="Ask AgroAssist"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
               stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </div>

      {/* ── Chat window ── */}
      {open && (
        <div id="chat-window" className="open">

          {/* Header */}
          <div id="chat-header">
            <div id="header-left">
              <div id="header-avatar">A</div>
              <div>
                <div id="chat-title">AgroAssist</div>
                <div id="chat-subtitle">ChatBot</div>
              </div>
            </div>

            {/* Language toggle */}
            <div id="lang-toggle">
              <button
                className={`lang-btn${currentLang === "en" ? " active" : ""}`}
                onClick={() => handleSetLang("en")}
              >EN</button>
              <button
                className={`lang-btn${currentLang === "hi" ? " active" : ""}`}
                onClick={() => handleSetLang("hi")}
              >हि</button>
              <button
                className={`lang-btn${currentLang === "mr" ? " active" : ""}`}
                onClick={() => handleSetLang("mr")}
              >म</button>
            </div>

            <button id="chat-close-btn" onClick={() => setOpen(false)}>
              &#10005;
            </button>
          </div>

          {/* Messages */}
          <div id="chat-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`msg ${msg.role === "user" ? "user-msg" : "bot-msg"}`}
                style={{ whiteSpace: "pre-line" }}
              >
                {msg.text}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="source-tag">
                    Source: {msg.sources.join(", ")}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="msg bot-msg typing-msg">Thinking...</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div id="chat-input-area">
            <input
              type="text"
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                listening
                  ? LISTENING_TEXT[currentLang]
                  : PLACEHOLDERS[currentLang]
              }
              disabled={loading}
              autoComplete="off"
            />

            {/* Mic button */}
            <button
              id="chat-mic-btn"
              className={listening ? "listening" : ""}
              onClick={toggleVoiceInput}
              title="Speak"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="white" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M19 10a7 7 0 01-14 0" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            {/* Send / Stop button */}
            {speaking ? (
              <button id="chat-stop-btn" onClick={stopSpeaking} title="Stop speaking">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                </svg>
              </button>
            ) : (
              <button
                id="chat-send-btn"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="white" strokeWidth="2.5" strokeLinecap="round"
                     strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
