import { useState } from "react";
import "./Home.css";
import Navbar from "../components/Navbar";
import UploadBox from "../components/UploadBox";
import ChatSection from "../components/ChatSection";

function Home({ theme, toggleTheme }) {
  const [documentName, setDocumentName] = useState("");

  return (
    <>
      <Navbar
  theme={theme}
  toggleTheme={toggleTheme}
/>

      <main className="home">
        <section className="hero">
          <h1>Chat with your PDF using AI</h1>

          <p>
            Upload any PDF document and ask intelligent questions using
            Retrieval-Augmented Generation powered by Gemini and ChromaDB.
          </p>
        </section>

        <section className="dashboard">
          <div className="upload-panel">
            <UploadBox setDocumentName={setDocumentName} />
          </div>

          <div className="chat-panel">
            <ChatSection documentName={documentName} />
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;