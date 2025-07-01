import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import { analyzeDocument } from '../services/api';
import '../styles/uploader.css';

// Set the workerSrc to the public folder for react-pdf/pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const DocumentUploader = ({ onAnalysisStart, onAnalysisComplete }) => {
  const [preview, setPreview] = useState(null);
  const [numPages, setNumPages] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setPreview(URL.createObjectURL(acceptedFiles[0]));
    }
  }, []);

  const handleAnalyze = async () => {
    onAnalysisStart();
    try {
      const file = await fetch(preview).then(r => r.blob());
      const result = await analyzeDocument(file);
      onAnalysisComplete(result.data);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Document analysis failed. Please try again.");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <div className="card uploader-container">
      {!preview ? (
        <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <div className="upload-icon">
            <svg viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <p>Drag & drop a PDF file here</p>
          <p className="hint">or click to browse files</p>
        </div>
      ) : (
        <div className="preview-container">
          <div className="pdf-preview">
            <Document
              file={preview}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="pdf-loading">Loading PDF...</div>}
            >
              <Page pageNumber={1} width={300} />
            </Document>
            <p className="page-count">{numPages} page{numPages !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-between">
            <button onClick={() => setPreview(null)} className="btn">
              Cancel
            </button>
            <button onClick={handleAnalyze} className="btn btn-primary">
              Analyze Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;