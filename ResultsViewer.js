import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';

const ResultsViewer = ({ jobId }) => {
  const [job, setJob] = useState(null);
  const [activeTab, setActiveTab] = useState('video');
  const [currentTime, setCurrentTime] = useState(0);
  const [activeStep, setActiveStep] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const fetchJob = async () => {
    try {
      console.log(`Fetching job: ${jobId}`);
      const response = await fetch(`http://localhost:5000/api/job/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Job data received:', data);
      setJob(data);
      
      // Set initial active step (first step)
      if (data.steps && data.steps.length > 0) {
        setActiveStep(data.steps[0].timestamp);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      setJob({
        error: true,
        message: 'Failed to load tutorial. Please try again.'
      });
    }
  };

  // Handle step click - jump to timestamp
  const handleStepClick = (timestamp, stepId) => {
    if (!timestamp) return;
    
    console.log(`Clicked step ${stepId} at ${timestamp}`);
    
    // Convert MM:SS to seconds
    const [minutes, seconds] = timestamp.split(':').map(Number);
    const timeInSeconds = (minutes * 60) + seconds;
    
    console.log(`Jumping to ${timeInSeconds} seconds`);
    
    // Try HTML5 video element first (most reliable)
    const videoElement = document.querySelector('video');
    if (videoElement) {
      console.log('Using HTML5 video element');
      videoElement.currentTime = timeInSeconds;
      videoElement.play().catch(e => console.log('Auto-play prevented:', e));
      setIsPlaying(true);
    } 
    // Try ReactPlayer
    else if (playerRef.current) {
      console.log('Using ReactPlayer');
      try {
        playerRef.current.seekTo(timeInSeconds, 'seconds');
      } catch (err) {
        console.error('ReactPlayer seek error:', err);
      }
    }
    
    setActiveStep(timestamp);
  };

  // Check if step is currently active (within 3 seconds)
  const isStepActive = (stepTimestamp) => {
    if (!stepTimestamp || !activeStep) return false;
    
    // If user clicked this step, it's active
    if (activeStep === stepTimestamp) return true;
    
    // Check if video time is near this step
    const [minutes, seconds] = stepTimestamp.split(':').map(Number);
    const stepTime = (minutes * 60) + seconds;
    
    return Math.abs(currentTime - stepTime) < 3;
  };

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle video play/pause
  const handlePlayPause = () => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      if (videoElement.paused) {
        videoElement.play();
        setIsPlaying(true);
      } else {
        videoElement.pause();
        setIsPlaying(false);
      }
    }
  };

  // Handle video progress
  const handleProgress = (state) => {
    setCurrentTime(state.playedSeconds);
    
    // Auto-highlight current step based on time
    if (job && job.steps) {
      for (let step of job.steps) {
        const [minutes, seconds] = step.timestamp.split(':').map(Number);
        const stepTime = (minutes * 60) + seconds;
        
        if (Math.abs(state.playedSeconds - stepTime) < 2) {
          if (activeStep !== step.timestamp) {
            setActiveStep(step.timestamp);
          }
          break;
        }
      }
    }
  };

  if (!job) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading tutorial results...</p>
      </div>
    );
  }

  if (job.error) {
    return (
      <div className="error-screen">
        <h3>❌ Error Loading Tutorial</h3>
        <p>{job.message || 'Please try uploading again.'}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.href = '/'}
        >
          ← Back to Upload
        </button>
      </div>
    );
  }

  // Get video URL - prefer directVideoUrl from backend
  const videoUrl = job.directVideoUrl || `http://localhost:5000${job.videoUrl}`;
  
  return (
    <div className="results-container">
      {/* Header */}
      <div className="results-header">
        <h1>🎬 AI-Generated Tutorial</h1>
        <div className="tutorial-info">
          <h2>{job.templateTitle || 'Screen Recording Tutorial'}</h2>
          <p className="category">{job.templateCategory || 'Productivity'} • {job.totalSteps || job.steps?.length || 0} steps</p>
        </div>
        
        {job.aiMode === 'simulated_enhanced' && (
          <div className="demo-banner">
            <span className="demo-badge">🤖 SIMULATED AI DEMO</span>
            <p>Click steps to jump in video • Switch between views</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="view-tabs">
        <button 
          className={`view-tab ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          <span className="tab-icon">🎥</span>
          Video Tutorial
        </button>
        <button 
          className={`view-tab ${activeTab === 'article' ? 'active' : ''}`}
          onClick={() => setActiveTab('article')}
        >
          <span className="tab-icon">📄</span>
          Step-by-Step Guide
        </button>
      </div>

      {/* Video View */}
      {activeTab === 'video' && (
        <div className="video-view">
          <div className="video-section">
            <div className="video-player-container">
              <div className="video-header">
                <h3>Interactive Tutorial Player</h3>
                <div className="time-display">
                  Current: {formatTime(currentTime)}
                </div>
              </div>
              
              <div className="video-wrapper">
                {videoUrl ? (
                  <>
                    {/* HTML5 Video Player - Most reliable */}
                    <video
                      ref={videoRef}
                      controls
                      width="100%"
                      height="100%"
                      onTimeUpdate={(e) => {
                        setCurrentTime(e.target.currentTime);
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      style={{
                        borderRadius: '10px',
                        backgroundColor: '#000',
                        maxHeight: '500px'
                      }}
                    >
                      <source src={videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    
                    {/* ReactPlayer as fallback (hidden) */}
                    <div style={{ display: 'none' }}>
                      <ReactPlayer
                        ref={playerRef}
                        url={videoUrl}
                        controls
                        width="100%"
                        height="100%"
                        onProgress={handleProgress}
                      />
                    </div>
                  </>
                ) : (
                  <div className="no-video">
                    <p>Video not available</p>
                  </div>
                )}
              </div>
              
              <div className="video-controls">
                <button 
                  className="control-button"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <div className="time-info">
                  Click steps on the right to navigate
                </div>
              </div>
            </div>
          </div>

          {/* Steps Panel */}
          <div className="steps-panel">
            <div className="steps-header">
              <h3>Tutorial Steps</h3>
              <p className="steps-count">{job.steps?.length || 0} steps • Click to jump</p>
            </div>
            
            <div className="steps-list">
              {job.steps && job.steps.length > 0 ? (
                job.steps.map((step) => {
                  const isActive = isStepActive(step.timestamp);
                  
                  return (
                    <div 
                      key={step.id}
                      className={`step-card ${isActive ? 'active-step' : ''}`}
                      onClick={() => handleStepClick(step.timestamp, step.id)}
                    >
                      <div className="step-header">
                        <div className="step-meta">
                          <span className="step-number">Step {step.id}</span>
                          <span className="step-timestamp">⏱️ {step.timestamp}</span>
                        </div>
                        {isActive && (
                          <span className="current-indicator">▶️ Now Playing</span>
                        )}
                      </div>
                      
                      <p className="step-text">{step.text}</p>
                      
                      <div className="step-visual">
                        <img 
                          src={step.thumbnail || step.screenshot} 
                          alt={`Step ${step.id}`}
                          className="step-image"
                          onError={(e) => {
                            e.target.src = `https://placehold.co/300x200/94a3b8/ffffff?text=Step+${step.id}`;
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-steps">
                  <p>No steps generated yet. Processing...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Article View */}
      {activeTab === 'article' && (
        <div className="article-view">
          <div className="article-header">
            <h2>{job.templateTitle || 'Complete Step-by-Step Guide'}</h2>
            <p className="article-description">
              {job.templateDescription || 'Follow these steps to complete the task'}
            </p>
          </div>
          
          <div className="article-content">
            {job.steps && job.steps.length > 0 ? (
              job.steps.map((step) => (
                <div key={step.id} className="article-step">
                  <div className="article-step-header">
                    <div className="article-step-number">
                      <span>{step.id}</span>
                    </div>
                    <div className="article-step-content">
                      <h3>{step.text}</h3>
                      <div className="step-details">
                        <span className="detail-item">⏱️ Time: {step.timestamp}</span>
                        <span className="detail-item">📊 Type: {step.type || 'Action'}</span>
                        <span className="detail-item">⏳ Duration: {step.duration || '7s'}</span>
                      </div>
                      
                      <div className="step-illustration">
                        <img 
                          src={step.screenshot} 
                          alt={`Visual guide for step ${step.id}`}
                          className="article-image"
                        />
                        <p className="image-caption">
                          <strong>Figure {step.id}:</strong> {step.text.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-content">
                <p>Article content will appear here after processing...</p>
              </div>
            )}
            
            {job.transcript && (
              <div className="transcript-section">
                <h3>📝 Full Transcript</h3>
                <div className="transcript-content">
                  <pre>{job.transcript}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="results-footer">
        <div className="footer-actions">
          <button 
            className="action-button primary"
            onClick={() => window.location.href = '/'}
          >
            ↩️ Upload Another Video
          </button>
          
          <div className="action-group">
            <button 
              className="action-button secondary"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }}
            >
              🔗 Copy Link
            </button>
            <button 
              className="action-button secondary"
              onClick={() => window.print()}
            >
              🖨️ Print Guide
            </button>
          </div>
        </div>
        
        <div className="footer-info">
          <p>
            <strong>Tutorial ID:</strong> {jobId} • 
            <strong> Generated:</strong> {new Date(job.createdAt).toLocaleTimeString()} • 
            <strong> Status:</strong> <span className="status-complete">✓ Complete</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsViewer;