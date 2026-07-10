import React, { useState } from "react";
import axios from "axios";
import "./ChatSection.css";

const ChatSection = ({ documentName }) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState(null);

  const handleAsk = async () => {
    if (!documentName) {
      setError("Please upload a PDF first.");
      return;
    }

    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/chat/",
        {
          question,
          document_name: documentName,
        }
      );

      setAnswer(response.data.answer);
      setSources(response.data.sources || []);
      setQuestion("");
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
      <h2 className="chat-title">Ask Questions</h2>

      <textarea
        className="chat-input"
        placeholder="Ask anything about your uploaded document..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
      />

      <button
        className="chat-button"
        onClick={handleAsk}
        disabled={loading || !documentName}
      >
        {loading ? "Thinking..." : "Ask AI"}
      </button>

      {error && (
        <div className="chat-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {answer && (
        <div className="chat-answer-card">
          <h3>Answer</h3>

          <p>{answer}</p>

          {sources.length > 0 && (
            <div className="chat-sources">
              <strong>Sources</strong>

              <ul>
                {sources.map((source, index) => (
                  <li key={index}>
                    📄 {source.source_document} — Page {source.page}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatSection;