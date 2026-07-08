# 📄 DocuMind AI

An AI-powered document assistant that lets users upload PDF documents and ask questions about them using Retrieval-Augmented Generation (RAG).

## 🚀 Features

- 📄 Upload PDF documents
- 💬 Chat with your documents
- 🧠 AI-powered answers using Google Gemini
- 🔍 Semantic search using ChromaDB
- 📑 Source citations
- 📝 AI-generated document summaries
- ❓ Suggested questions based on the document

---

## 🛠 Tech Stack

### Frontend
- React
- Vite
- CSS

### Backend
- FastAPI
- Python

### AI & RAG
- Google Gemini
- ChromaDB
- PyMuPDF

---

## 📂 Project Structure

```
DocuMindAI
│
├── backend
│   ├── app
│   ├── uploads
│   ├── chroma_db
│   ├── requirements.txt
│   └── .env
│
├── frontend
│   ├── src
│   ├── public
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/Bhawna-codeX/DocuMindAI.git
```

### Backend

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt
```

Run the backend

```bash
uvicorn app.main:app --reload
```

---

### Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## 📅 Development Roadmap

- ✅ Project setup
- ✅ React frontend
- ✅ FastAPI backend
- ⏳ PDF Upload
- ⏳ Text Extraction
- ⏳ RAG Pipeline
- ⏳ Chat Interface
- ⏳ Deployment

---

## 📜 License

This project is for educational and portfolio purposes.