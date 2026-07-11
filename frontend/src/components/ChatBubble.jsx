import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useState } from "react";
import "./ChatBubble.css";

const ChatBubble = ({ type, message, loading = false }) => {
  const isUser = type === "user";
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(String(message ?? ""));

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);

  } catch (err) {
    console.error(err);
  }
};
const handleReadAloud = () => {

  if (speaking) {

    window.speechSynthesis.cancel();
    setSpeaking(false);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(
    String(message ?? "")
  );

  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = () => {
    setSpeaking(true);
  };

  utterance.onend = () => {
    setSpeaking(false);
  };

  utterance.onerror = () => {
    setSpeaking(false);
  };

  window.speechSynthesis.cancel();

  window.speechSynthesis.speak(utterance);
};

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

    <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {typeof message === "string"
            ? message
            : String(message ?? "")
        }
    </ReactMarkdown>

    {!isUser && (
        <div className="message-actions">

            <button
                className="copy-button"
                onClick={handleCopy}
            >
                {copied ? "✅ Copied" : "📋 Copy"}
            </button>

            <button
    className="read-button"
    onClick={handleReadAloud}
>
    {speaking ? "⏹ Stop" : "🔊 Read"}
</button>

        </div>
    )}

</div>
          
        )}
      </div>
    </div>
  );
};

export default ChatBubble;