import { useState } from "react";
import Navbar from "../components/Navbar";
import UploadBox from "../components/UploadBox";
import ChatSection from "../components/ChatSection";

function Home() {
  const [documentName, setDocumentName] = useState("");

  return (
    <>
      <Navbar />

      <div className="home">
        <h1>Chat with your PDF using AI</h1>

        <p>
          Upload any PDF document and ask questions using
          Retrieval-Augmented Generation powered by Gemini.
        </p>

        <UploadBox setDocumentName={setDocumentName} />

        <ChatSection documentName={documentName} />
      </div>
    </>
  );
}

export default Home;