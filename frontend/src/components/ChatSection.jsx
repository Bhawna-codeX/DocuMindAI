import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiSend } from "react-icons/fi";
import ChatBubble from "./ChatBubble";
import "./ChatSection.css";

const ChatSection = ({ documentName }) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSuggestionClick = (suggestion) => {
  setQuestion(suggestion);

  setTimeout(() => {
    handleAsk(suggestion);
  }, 100);
};

  const handleAsk = async (customQuestion = null) => {
    if (!documentName) {
      setError("Please upload a PDF first.");
      return;
    }

    if (!question.trim()) return;

    const currentQuestion = customQuestion || question.trim();

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: currentQuestion,
      },
    ]);

    setQuestion("");
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/chat/",
        {
          question: currentQuestion,
          document_name: documentName,
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: response.data.answer,
          sources: response.data.sources || [],
        },
      ]);
    } catch (err) {
      const backendMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Something went wrong.";

      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-section">
      <div className="chat-card">
        <h2 className="chat-title">Ask Questions</h2>

        <p className="chat-subtitle">
          Ask anything about your uploaded PDF. DocuMind AI answers only from
          the uploaded document using Retrieval-Augmented Generation.
        </p>

        {/* Conversation */}
        <div className="chat-messages">

  {messages.length === 0 && !loading && (
    <div className="empty-chat">

      <div className="empty-chat-icon">
        🤖
      </div>

      <h2>Welcome to DocuMind AI</h2>

      <p>
        Upload a PDF and ask intelligent questions using
        Retrieval-Augmented Generation.
      </p>

      <div className="suggestions">

        <div
    className="suggestion-card"
    onClick={() =>
        handleSuggestionClick("Summarize this document.")
    }
>
    📄 Summarize this document
</div>

        <div
    className="suggestion-card"
    onClick={() =>
        handleSuggestionClick("What are the key points?")
    }
>
    🔍 What are the key points?
</div>

       <div
    className="suggestion-card"
    onClick={() =>
        handleSuggestionClick("List important dates.")
    }
>
    📅 List important dates
</div>

      <div
    className="suggestion-card"
    onClick={() =>
        handleSuggestionClick("Explain page 3.")
    }
>
    💡 Explain page 3
</div>

      </div>

    </div>
  )}

  {messages.map((msg, index) => (
    <div key={`${msg.role}-${index}`}>
      <ChatBubble
        type={msg.role}
        message={msg.text}
      />

      {msg.role === "ai" &&
        msg.sources &&
        msg.sources.length > 0 && (
        <div className="sources">
  <div className="sources-title">
    Sources
  </div>

  {msg.sources.length > 0 && (
    <div className="source-document">
      📄 {msg.sources[0].source_document}
    </div>
  )}

  <ul className="sources-list">
    {msg.sources.map((source, i) => (
      <li key={i}>
        Page {source.page}
      </li>
    ))}
  </ul>
</div>
        )}
    </div>
  ))}

  {loading && (
    <ChatBubble
      type="ai"
      loading={true}
    />
  )}

  <div ref={messagesEndRef}></div>

</div>

         

        <div className="chat-input-container">
  <textarea
    className="chat-input-modern"
    placeholder="Ask anything about your uploaded document..."
    value={question}
    onChange={(e) => setQuestion(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAsk();
      }
    }}
    rows={2}
  />

  <button
    className="send-button"
    onClick={handleAsk}
    disabled={loading || !documentName}
  >
    {loading ? "..." : <FiSend />}
  </button>
</div>

        {error && (
          <div className="error-card">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSection;