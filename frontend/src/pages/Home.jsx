import { useState } from "react";
import UploadBox from "../components/UploadBox";
import ChatSection from "../components/ChatSection";

function Home() {
  const [documentName, setDocumentName] = useState("");

  return (
    <div className="home">
      <h1>📄 DocuMind AI</h1>

      <p>Upload a PDF and ask questions using AI.</p>

      <UploadBox setDocumentName={setDocumentName} />

      <ChatSection documentName={documentName} />
    </div>
  );
}

export default Home;