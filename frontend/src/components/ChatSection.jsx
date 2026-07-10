import React, { useState } from "react";
import axios from "axios";

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
      const response = await axios.post("http://127.0.0.1:8000/chat/", {
        question: question,
        document_name: documentName,
      });

      setAnswer(response.data.answer);
      setSources(response.data.sources);
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
    <div style={styles.container}>
      <h2 style={styles.heading}>Ask Questions</h2>

      <textarea
        style={styles.textarea}
        placeholder="Type your question here..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
      />

      <button
        style={{
          ...styles.button,
          ...(loading ? styles.buttonDisabled : {}),
        }}
        onClick={handleAsk}
        disabled={loading || !documentName}
      >
        {loading ? "Thinking..." : "Ask AI"}
      </button>

      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {answer && (
        <div style={styles.card}>
          <h3 style={styles.answerHeading}>Answer</h3>
          <p style={styles.answerText}>{answer}</p>

          {sources && sources.length > 0 && (
            <div style={styles.sourcesSection}>
              <strong>Sources:</strong>
              <ul style={styles.sourcesList}>
                {sources.map((page, index) => (
                  <li key={index}>
                     {page.source_document} — Page {page.page}
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

const styles = {
  container: {
    maxWidth: "600px",
    margin: "20px auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    marginBottom: "12px",
    color: "#222",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    resize: "vertical",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "10px",
    padding: "10px 20px",
    backgroundColor: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
  },
  buttonDisabled: {
    backgroundColor: "#90b8ee",
    cursor: "not-allowed",
  },
  errorBox: {
    marginTop: "16px",
    padding: "12px",
    backgroundColor: "#fdecea",
    color: "#b00020",
    border: "1px solid #f5c6cb",
    borderRadius: "6px",
  },
  card: {
    marginTop: "16px",
    padding: "16px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  answerHeading: {
    marginTop: 0,
    marginBottom: "8px",
    color: "#222",
  },
  answerText: {
    color: "#333",
    lineHeight: "1.5",
  },
  sourcesSection: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #eee",
  },
  sourcesList: {
    marginTop: "6px",
    paddingLeft: "20px",
  },
};

export default ChatSection;