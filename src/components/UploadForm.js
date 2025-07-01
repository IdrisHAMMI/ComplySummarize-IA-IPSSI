import React, { useState } from 'react';
import axios from 'axios';
import SummaryDisplay from './SummaryDisplay';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setSummary("");
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:5000/summarize", formData);
      setSummary(response.data.summary);
    } catch (err) {
      setError("Erreur lors de la récupération du résumé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-form">
      <form onSubmit={handleUpload}>
        <input type="file" accept=".pdf,.txt" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Analyser le document</button>
      </form>

      {file && !loading && (
        <p style={{ marginTop: '1rem', color: '#555' }}>
          📄 Fichier prêt à être analysé : {file.name}
        </p>
      )}

      {loading && <div className="spinner"></div>}
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
      {summary && <SummaryDisplay summary={summary} />}
    </div>
  );
};

export default UploadForm;
