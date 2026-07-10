import React from "react";
import "./ChatBubble.css";

const ChatBubble = ({ type, message }) => {
  return (
    <div className={`chat-bubble ${type}`}>
      <div className="chat-avatar">
        {type === "user" ? "🧑" : "🤖"}
      </div>

      <div className="chat-message">
        {message}
      </div>
    </div>
  );
};

export default ChatBubble;