import React, { useState, useRef } from "react";
import api from "../services/api";
import "./UploadBox.css";

const UploadBox = ({ setDocumentName }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);

  const resetMessages = () => {
    setSuccess(null);
    setError(null);
  };

  const validateAndSetFile = (selectedFile) => {
    resetMessages();

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are supported. Please choose a .pdf file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleBoxClick = () => {
    inputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setUploading(true);
    resetMessages();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess(
        response.data.message ||
          "Document uploaded and processed successfully."
      );

      // IMPORTANT: Needed for ChatSection
      setDocumentName(response.data.filename);

    } catch (err) {
      const backendMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Upload failed.";

      setError(backendMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-card">
      <div className="upload-card__header">
        <span className="upload-card__eyebrow">
          Document Intake
        </span>

        <h2 className="upload-card__title">
          Upload your PDF
        </h2>

        <p className="upload-card__subtitle">
          Add a document to start asking questions.
        </p>
      </div>

      <div
        className={`dropzone ${
          isDragging ? "dropzone--active" : ""
        } ${file ? "dropzone--filled" : ""}`}
        onClick={handleBoxClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="dropzone__input"
        />

        <svg
          className="dropzone__icon"
          viewBox="0 0 64 64"
          fill="none"
        >
          <rect
            x="12"
            y="4"
            width="34"
            height="46"
            rx="4"
            fill="#EEF4FF"
            stroke="#2F6FED"
            strokeWidth="2"
          />

          <path
            d="M38 4v10a4 4 0 004 4h10"
            fill="#DCE8FF"
            stroke="#2F6FED"
            strokeWidth="2"
          />

          <text
            x="18"
            y="36"
            fontSize="11"
            fontWeight="700"
            fill="#2F6FED"
          >
            PDF
          </text>
        </svg>

        <p className="dropzone__text">
          {file
            ? "File ready to upload"
            : "Click or drag PDF here"}
        </p>

        <p className="dropzone__hint">
          PDF files only
        </p>
      </div>

      {file && (
        <div className="filename-row">
          <svg
            className="filename-row__check"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="12"
              fill="#16A34A"
            />

            <path
              d="M7 12.5l3 3 7-7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span className="filename-row__name">
            {file.name}
          </span>
        </div>
      )}

      <button
        className="upload-button"
        onClick={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <span className="upload-button__loading">
            <span className="spinner"></span>
            Uploading...
          </span>
        ) : (
          "Upload PDF"
        )}
      </button>

      {success && (
        <div className="message-card message-card--success">
          <svg
            className="message-card__icon"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="12"
              fill="#16A34A"
            />

            <path
              d="M7 12.5l3 3 7-7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="message-card message-card--error">
          <svg
            className="message-card__icon"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="12"
              fill="#DC2626"
            />

            <path
              d="M12 7v6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <circle
              cx="12"
              cy="16.5"
              r="1.2"
              fill="white"
            />
          </svg>

          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadBox;