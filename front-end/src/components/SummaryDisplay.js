import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReportPDF from './ReportPDF';

const SummaryDisplay = ({ data }) => {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Analysis Report',
          text: `Summary: ${data.summary ? data.summary.substring(0, 100) : ''}...`,
          url: window.location.href,
        });
      } else {
        alert('Sharing not supported in your browser');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="card results-container" ref={componentRef}>
      <div className="flex-between export-actions">
        <div className="flex">
          <button onClick={handlePrint} className="btn btn-outline">
            Print Report
          </button>
          <PDFDownloadLink
            document={<ReportPDF data={data} />}
            fileName="analysis_report.pdf"
          >
            {({ loading }) => (
              <button className={`btn ${loading ? '' : 'btn-primary'}`}>
                {loading ? 'Generating...' : 'Download PDF'}
              </button>
            )}
          </PDFDownloadLink>
        </div>
        <button onClick={handleShare} className="btn">
          Share Results
        </button>
      </div>

      <section className="summary-section">
        <h2>Document Summary</h2>
        <div className="summary-content">{data.summary}</div>
      </section>

      <div className="results-grid">
        <section className="keypoints-section">
          <h2>Key Points</h2>
          <ul>
            {(data.keyPoints || []).map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="actions-section">
          <h2>Suggested Actions</h2>
          <div className="actions-grid">
            {(data.suggestedActions || []).map((action, index) => (
              <div
                key={index}
                className={`action-card ${action.priority}`}
              >
                <span className="priority-badge">{action.priority}</span>
                <p className="action-text">{action.action}</p>
                <div className="action-tools">
                  <button className="action-btn">✓</button>
                  <button className="action-btn">✎</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SummaryDisplay;
