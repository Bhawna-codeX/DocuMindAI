import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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

  const handleAsk = async () => {
    if (!documentName) {
      setError("Please upload a PDF first.");
      return;
    }

    if (!question.trim()) return;

    const currentQuestion = question.trim();

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

                    <ul className="sources-list">
                      {msg.sources.map((source, i) => (
                        <li key={`${source.source_document}-${source.page}-${i}`}>
                          📄 <strong>{source.source_document}</strong> — Page{" "}
                          {source.page}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <ChatBubble
              type="ai"
              loading={true}
            />
          )}

          {/* Auto Scroll Target */}
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
    {loading ? "..." : "➜"}
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