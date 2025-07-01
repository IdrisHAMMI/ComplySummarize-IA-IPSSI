import { useState } from 'react';
import DocumentUploader from './components/DocumentUploader';
import SummaryDisplay from './components/SummaryDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import HistorySidebar from './components/HistorySidebar';
import './styles/main.css';

function App() {
  const [analyses, setAnalyses] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalysisComplete = (data) => {
    const analysisWithMetadata = {
      ...data,
      metadata: {
        ...data.metadata,
        processedAt: new Date().toISOString()
      }
    };
    setCurrentAnalysis(analysisWithMetadata);
    setAnalyses(prev => [analysisWithMetadata, ...prev.slice(0, 9)]);
    setIsLoading(false);
  };

  return (
    <div className="container">
      <div className="app-container animate-in">
        <HistorySidebar 
          analyses={analyses} 
          onSelectAnalysis={setCurrentAnalysis} 
        />
        
        <header className="flex-between">
          <h1>AI Regulatory Assistant</h1>
          {currentAnalysis && (
            <button 
              onClick={() => setCurrentAnalysis(null)} 
              className="btn btn-outline"
            >
              + New Analysis
            </button>
          )}
        </header>

        <main>
          {!currentAnalysis ? (
            <DocumentUploader 
              onAnalysisStart={() => setIsLoading(true)}
              onAnalysisComplete={handleAnalysisComplete}
            />
          ) : (
            <SummaryDisplay data={currentAnalysis} />
          )}

          {isLoading && <LoadingSpinner />}
        </main>
      </div>
    </div>
  );
}

export default App;