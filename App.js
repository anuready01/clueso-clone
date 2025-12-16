import React, { useState } from 'react';
import './App.css';
import Uploader from './components/Uploader';
import ResultsViewer from './components/ResultsViewer';

function App() {
  const [currentView, setCurrentView] = useState('upload');
  const [currentJobId, setCurrentJobId] = useState(null);

  const handleUploadComplete = (jobId) => {
    setCurrentJobId(jobId);
    setCurrentView('processing');
    
    // Poll for job completion
    const pollInterval = setInterval(() => {
      fetch(`http://localhost:5000/api/job/${jobId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setCurrentView('results');
          }
        })
        .catch(err => {
          console.error('Polling error:', err);
          clearInterval(pollInterval);
        });
    }, 2000);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎬 Clueso Clone</h1>
        <p>AI-powered screen recording to tutorial converter</p>
      </header>
      
      <main className="App-main">
        {currentView === 'upload' && (
          <Uploader onUploadComplete={handleUploadComplete} />
        )}
        
        {currentView === 'processing' && (
          <div className="processing-screen">
            <div className="loader"></div>
            <h2>✨ AI is processing your video</h2>
            <p>Transcribing audio • Enhancing script • Generating steps</p>
            <p className="job-id">Job ID: {currentJobId}</p>
          </div>
        )}
        
        {currentView === 'results' && currentJobId && (
          <ResultsViewer jobId={currentJobId} />
        )}
      </main>
      
      <footer className="App-footer">
        <p>Built with React & Node.js • Clueso Clone Assignment</p>
      </footer>
    </div>
  );
}

export default App;