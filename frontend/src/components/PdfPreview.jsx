
import { Document, Page, pdfjs } from "react-pdf";
import { useState, useEffect} from "react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import "./PdfPreview.css";

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfPreview = ({ pdfUrl}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }


  if (!pdfUrl) {
    return (
      <div className="pdf-preview empty-preview">
        <h3>📄 PDF Preview</h3>
        <p>Upload a PDF to preview it here.</p>
      </div>
    );
  }

  return (
    <div className="pdf-preview">

      <div className="pdf-header">

  <h3>📄 PDF Preview</h3>

  <div className="pdf-controls">

    <button
      disabled={pageNumber <= 1}
      onClick={() => setPageNumber(pageNumber - 1)}
    >
      ◀
    </button>

    <span>
      Page {pageNumber} / {numPages}
    </span>

    <button
      disabled={pageNumber >= numPages}
      onClick={() => setPageNumber(pageNumber + 1)}
    >
      ▶
    </button>

  </div>

</div>
<Document
  file={pdfUrl}
  onLoadSuccess={onDocumentLoadSuccess}
>
  <Page
    pageNumber={pageNumber}
    width={400}
  />
</Document>

      </div>

    
  );
};

export default PdfPreview;