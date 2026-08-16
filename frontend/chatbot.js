const API_URL = "http://127.0.0.1:8000/api/chat";
const VOICE_OUTPUT_ENABLED = true;

// current language — "en", "hi", or "mr"
let currentLang = "en";

// BCP-47 codes for mic and speech
const LANG_CODES = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN"
};

// placeholder text per language
const PLACEHOLDERS = {
  en: "Ask about plants or tap mic...",
  hi: "पौधों के बारे में पूछें...",
  mr: "झाडांबद्दल विचारा..."
};

// listening text per language
const LISTENING_TEXT = {
  en: "Listening... speak now",
  hi: "सुन रहा हूँ... बोलिए",
  mr: "ऐकत आहे... बोला"
};

// ── Set language from toggle ──────────────────────────────────
function setLang(lang) {
  currentLang = lang;

  document.getElementById("btn-en").classList.toggle("active", lang === "en");
  document.getElementById("btn-hi").classList.toggle("active", lang === "hi");
  document.getElementById("btn-mr").classList.toggle("active", lang === "mr");

  document.getElementById("chat-input").placeholder = PLACEHOLDERS[lang];
}

// ── Session ID ────────────────────────────────────────────────
function getSessionId() {
  let id = sessionStorage.getItem("agro_session_id");
  if (!id) {
    id = "sess_" + Math.random().toString(36).substr(2, 9)
             + "_" + Date.now();
    sessionStorage.setItem("agro_session_id", id);
  }
  return id;
}

// ── Strip markdown ────────────────────────────────────────────
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

// ── Toggle chat window ────────────────────────────────────────
function toggleChat() {
  const win       = document.getElementById("chat-window");
  const iconOpen  = document.getElementById("bubble-icon-open");
  const iconClose = document.getElementById("bubble-icon-close");
  const isOpen    = win.classList.toggle("open");
  iconOpen.style.display  = isOpen ? "none"  : "block";
  iconClose.style.display = isOpen ? "block" : "none";
  if (isOpen) document.getElementById("chat-input").focus();
}

// ── Append message bubble ─────────────────────────────────────
function appendMessage(text, role, sources) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user-msg" : "bot-msg");
  div.innerText = text;

  if (sources && sources.length > 0) {
    const tag = document.createElement("div");
    tag.className = "source-tag";
    tag.innerText = "Source: " + sources.join(", ");
    div.appendChild(tag);
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── Typing indicator ──────────────────────────────────────────
function showTyping() {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "msg typing-msg";
  div.id = "typing-indicator";
  div.innerHTML = "Thinking<span id='dots'>.</span>";
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  let count = 1;
  window._typingTimer = setInterval(() => {
    count = (count % 3) + 1;
    const dots = document.getElementById("dots");
    if (dots) dots.innerText = ".".repeat(count);
  }, 400);
}

function hideTyping() {
  clearInterval(window._typingTimer);
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// ── Show / hide stop button ───────────────────────────────────
function showStopButton() {
  document.getElementById("chat-stop-btn").style.display = "flex";
  document.getElementById("chat-send-btn").style.display = "none";
}

function hideStopButton() {
  document.getElementById("chat-stop-btn").style.display = "none";
  document.getElementById("chat-send-btn").style.display  = "flex";
}

// ── Stop speaking ─────────────────────────────────────────────
function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  hideStopButton();
}

// ── Voice OUTPUT ──────────────────────────────────────────────
function speakText(text, lang) {
  if (!VOICE_OUTPUT_ENABLED) return;
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  let langCode  = LANG_CODES[lang] || "en-IN";

    if (lang === "mr") {
    langCode = "hi-IN";
  }


  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = langCode;
  utterance.rate  = 0.95;
  utterance.pitch = 1.0;

  const voices   = window.speechSynthesis.getVoices();
  const baseLang = langCode.split("-")[0];

  const matched =
    voices.find(v => v.lang === langCode) ||
    voices.find(v => v.lang.startsWith(baseLang));

  if (matched) utterance.voice = matched;

  utterance.onstart = () => showStopButton();
  utterance.onend   = () => hideStopButton();
  utterance.onerror = () => hideStopButton();

  window.speechSynthesis.speak(utterance);
}

// ── Voice INPUT ───────────────────────────────────────────────
let recognition = null;
let isListening  = false;

function toggleVoiceInput() {
  if (!("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)) {
    alert("Voice input not supported. Please use Chrome or Edge.");
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang           = LANG_CODES[currentLang];
  recognition.interimResults = true;
  recognition.continuous     = false;

  const micBtn = document.getElementById("chat-mic-btn");
  const input  = document.getElementById("chat-input");

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    input.placeholder = LISTENING_TEXT[currentLang];
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    input.value = transcript;
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    input.placeholder = PLACEHOLDERS[currentLang];
    if (input.value.trim()) sendMessage();
  };

  recognition.onerror = (event) => {
    isListening = false;
    micBtn.classList.remove("listening");
    input.placeholder = PLACEHOLDERS[currentLang];
    if (event.error === "not-allowed") {
      alert("Microphone permission denied. Please allow mic access.");
    } else if (event.error !== "no-speech") {
      console.warn("Voice error:", event.error);
    }
  };

  recognition.start();
}

// ── Send message ──────────────────────────────────────────────
async function sendMessage() {
  const input   = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  const text    = input.value.trim();

  if (!text) return;

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  hideStopButton();

  appendMessage(text, "user");
  input.value      = "";
  input.disabled   = true;
  sendBtn.disabled = true;
  showTyping();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        message: text,
        lang: currentLang
      })
    });

    if (!response.ok) throw new Error("Server returned " + response.status);

    const data       = await response.json();
    const cleanReply = stripMarkdown(data.reply);

    hideTyping();
    appendMessage(cleanReply, "bot", data.sources);
    speakText(cleanReply, currentLang);

  } catch (err) {
    hideTyping();
    appendMessage(
      "Sorry, could not connect to the server. Make sure the backend is running.",
      "bot"
    );
    console.error("Chat error:", err);
  } finally {
    input.disabled   = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

// preload voices
window.speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();