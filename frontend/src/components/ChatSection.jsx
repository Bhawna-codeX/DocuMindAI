import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiSend } from "react-icons/fi";
import { FiDownload, FiPlus } from "react-icons/fi";
import ChatBubble from "./ChatBubble";
import "./ChatSection.css";

const ChatSection = ({ documentName ,onPageClick,}) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const sessionId = useRef(crypto.randomUUID());

  // Auto-scroll to the latest message
useEffect(() => {

  const container = chatContainerRef.current;

  if (!container) return;

  const distance =
    container.scrollHeight -
    container.scrollTop -
    container.clientHeight;

  if (distance < 120) {

    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
    });

  }

}, [messages]);

  const handleSuggestionClick = (suggestion) => {
  setQuestion(suggestion);

  setTimeout(() => {
    handleAsk(suggestion);
  }, 100);
};
const handleNewChat = () => {
  setMessages([]);
  setError(null);
  setQuestion("");

  // Start a new conversation session
  sessionId.current = crypto.randomUUID();
};
const handleExportChat = () => {

  if (messages.length === 0) {
    alert("No conversation to export.");
    return;
  }

  let content = "";

  content += "=====================================\n";
  content += "        DocuMind AI Chat Export\n";
  content += "=====================================\n\n";

  content += `Document: ${documentName}\n\n`;

  messages.forEach((msg) => {

    content +=
      msg.role === "user"
        ? "You:\n"
        : "DocuMind AI:\n";

    content += `${msg.text}\n\n`;

    if (
      msg.role === "ai" &&
      msg.sources &&
      msg.sources.length > 0
    ) {

      content += "Sources:\n";

      msg.sources.forEach((source) => {
        content += `• Page ${source.page}\n`;
      });

      content += "\n";
    }

    content +=
      "-------------------------------------\n\n";

  });

  const blob = new Blob(
    [content],
    { type: "text/plain" }
  );

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    `DocuMind_Chat_${new Date()
      .toISOString()
      .slice(0,10)}.txt`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.URL.revokeObjectURL(url);

};
const updateLastAIMessage = (text) => {
  setMessages((prev) => {

    const updated = [...prev];

    if (updated.length === 0) return updated;

    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      text,
    };

    return updated;

  });
};

  const streamResponse = async (fullText, sources = []) => {

  // Create ONE empty AI message
  setMessages((prev) => [
    ...prev,
    {
      role: "ai",
      text: "",
      sources,
    },
  ]);

  // Let React render the bubble first
  await new Promise((resolve) => setTimeout(resolve, 40));

  const words = fullText.split(" ");

  let currentText = "";

  for (let i = 0; i < words.length; i += 2) {

    currentText +=
      (currentText ? " " : "") +
      words.slice(i, i + 2).join(" ");

    updateLastAIMessage(currentText);

    await new Promise((resolve) =>
      setTimeout(resolve, 45)
    );

  }

};
 const handleAsk = async (customQuestion = "") => {

  if (typeof customQuestion !== "string") {
  customQuestion = "";
}

  if (!documentName) {
    setError("Please upload a PDF first.");
    return;
  }

  const currentQuestion = customQuestion || question.trim();

  if (!currentQuestion) return;
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
            session_id: sessionId.current,
         }
        );

        
    const answer =
  typeof response.data.answer === "string"
    ? response.data.answer
    : JSON.stringify(response.data.answer, null, 2);

// Hide the typing indicator before streaming
setLoading(false);

await new Promise(resolve => setTimeout(resolve, 150));

await streamResponse(answer, response.data.sources || []);

// Don't setLoading(false) again later
    } catch (err) {
      const backendMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Something went wrong.";

      setError(backendMessage);
    } finally {
           }
  };

  return (
    <div className="chat-section">
      <div className="chat-card">
        <div className="chat-header">
  <h2 className="chat-title">
    Ask Questions</h2>

     <div className="header-buttons">

        <button
            className="export-button"
            onClick={handleExportChat}
        >
             <FiDownload size={18}/>
              Export Chat
        </button>
  <button
    className="new-chat-button"
    onClick={handleNewChat}
  >
    <FiPlus size={18}/>
    New Chat
  </button>
</div>
</div>

        <p className="chat-subtitle">
          Ask anything about your uploaded PDF. DocuMind AI answers only from
          the uploaded document using Retrieval-Augmented Generation.
        </p>

        {/* Conversation */}
        <div className="chat-messages"
           ref={chatContainerRef}
           >

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
  📄 Page {source.page}
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
  onClick={() => handleAsk()}
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