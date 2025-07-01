import { useState } from 'react';
import { X, Clock, FileText } from 'react-feather';
import '../styles/sidebar.css';

const HistorySidebar = ({ analyses, onSelectAnalysis }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`history-toggle ${isOpen ? 'open' : ''}`}
        aria-label={isOpen ? 'Close history' : 'Open history'}
      >
        {isOpen ? <X size={20} /> : <Clock size={20} />}
      </button>
      
      <div className={`history-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>
            <FileText size={18} className="icon" />
            <span>Document History</span>
          </h3>
          <button 
            onClick={() => setIsOpen(false)} 
            className="close-btn"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          {analyses.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} className="icon" />
              <p>No documents analyzed yet</p>
              <small>Upload your first document to get started</small>
            </div>
          ) : (
            <ul className="history-list">
              {analyses.map((analysis, index) => (
                <li 
                  key={index} 
                  onClick={() => {
                    onSelectAnalysis(analysis);
                    setIsOpen(false);
                  }}
                  className="history-item"
                >
                  <div className="file-info">
                    <span className="filename">{analysis.metadata.filename}</span>
                    <span className="date">
                      {new Date(analysis.metadata.processedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="preview-summary">
                    {analysis.summary.substring(0, 60)}...
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;