import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React from "react";
import "./ChatBubble.css";

const ChatBubble = ({ type, message, loading = false }) => {
  const isUser = type === "user";

  return (
    <div className={`chat-bubble ${isUser ? "user" : "ai"}`}>
      <div className="chat-avatar">
        {isUser ? "🧑" : "🤖"}
      </div>

      <div className="chat-content">
        <div className="chat-sender">
          {isUser ? "You" : "DocuMind AI"}
        </div>

        {loading ? (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          <div className="chat-message markdown-body">
              <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
              >
                 {message}
              </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;