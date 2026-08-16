# AgroAssist Chatbot — RAG-Powered Multilingual Farming Assistant

An intelligent, voice-enabled chatbot built with **Retrieval-Augmented Generation (RAG)**, designed to provide accurate, hallucination-free agricultural guidance to Indian farmers in **English, Hindi, and Marathi**.

---

## 📌 Overview

**AgroAssist Chatbot** is a production-ready conversational AI module developed as part of the **AgroAssist — AI-Powered Smart Farming System** major project.

The chatbot is embedded as a floating widget across all pages of the web application and provides farmers with instant, grounded responses about **plant diseases, remedies, fertilizers, and farming practices**.

Unlike traditional intent-based chatbot systems (such as **Dialogflow**), this implementation uses **Retrieval-Augmented Generation (RAG)** — ensuring every response is grounded in a curated plant knowledge base rather than relying solely on the language model's parametric memory.

This eliminates hallucination and guarantees factually accurate, source-backed answers.

---

## Architecture

The system is built on a **two-pipeline architecture**:

1. **Ingestion Pipeline** — one-time
2. **Runtime Query Pipeline** — every message

---

## Features

### 1. RAG Pipeline

- **PDF knowledge base** — plant-specific documents loaded via `PyMuPDFLoader` and chunked into **800-character segments** with **100-character overlap** using `RecursiveCharacterTextSplitter`.

- **Vector embeddings** — generated using `sentence-transformers/all-MiniLM-L6-v2` via LangChain's `HuggingFaceEmbeddings`.

- **ChromaDB vector store** — persisted locally; semantic similarity search retrieves the **top-4 most relevant chunks** per query.

- **Groq LLaMA 3.3 70B** — fast cloud inference via Groq API; receives retrieved context + conversation history to generate grounded, accurate responses.

- **Session memory** — last **10 messages** maintained per session for coherent multi-turn conversations.

---

### 2. Multilingual Support

- **Three-language toggle** — English (EN) / Hindi (हि) / Marathi (म) — selectable from the chat header.

- **Language-specific prompting** — the backend instructs the LLM to respond entirely in the selected language using the appropriate script (**Devanagari for Hindi and Marathi**).

- **Language-aware placeholders and listening indicators** update dynamically based on selection.

---

### 3. Voice Interaction

- **Voice input** — powered by the browser-native **Web Speech API (`SpeechRecognition`)**; mic language switches automatically based on the selected toggle (`en-IN`, `hi-IN`, `mr-IN`).

- **Text-to-speech output** — bot responses are read aloud using **SpeechSynthesis** with language-matched voice selection.

- **Stop speaking** — a pulsing red stop button appears while the bot is speaking, allowing the user to interrupt mid-response; disappears automatically when speech completes.

- **Microphone button** pulses red with animation while actively listening.

---

### 4. Chat UI

- **Floating chat bubble** (bottom-right, fixed position) present on all pages.

- **Smooth slide-up animation** on open; separate open/close SVG icons.

- **Real-time typing indicator** with animated dots while awaiting response.

- **Source attribution** displayed beneath bot responses (shows which PDF the answer came from).

- **Markdown stripping** — LLM output is cleaned of all `**`, `##`, `*` formatting before display and speech.

- **Fully responsive** — adapts to mobile viewports.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Voice I/O** | Web Speech API — `SpeechRecognition` + `SpeechSynthesis` |
| **Backend** | Python, FastAPI, Uvicorn |
| **RAG Framework** | LangChain, LangChain-Community |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace) |
| **Vector Store** | ChromaDB (local persistent) |
| **PDF Loader** | PyMuPDF (via LangChain PyMuPDFLoader) |
| **LLM** | LLaMA 3.3 70B Versatile via Groq API |
| **Environment** | python-dotenv |
| **Deployment** | Railway (backend) + Vercel (frontend) |

---

## How RAG Prevents Hallucination

Traditional LLM chatbots generate responses purely from **parametric memory** — which can produce confident but factually incorrect answers (**hallucination**).

This system addresses that through **RAG**:

1. Every user query is converted to a **vector embedding**.

2. **ChromaDB** performs cosine similarity search against pre-indexed plant knowledge chunks.

3. Only the **top-4 most semantically relevant chunks** are injected into the LLM prompt as context.

4. The LLM is explicitly instructed to answer using **only the provided context**.

5. **Source attribution** is returned alongside every response.

This architecture guarantees that responses are always grounded in the actual plant knowledge documents, making it reliable for agricultural advisory use.
