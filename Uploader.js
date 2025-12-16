import React, { useState } from 'react';
import axios from 'axios';

const Uploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a video file first');
      return;
    }

    setUploading(true);
    
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        console.log('Upload successful:', response.data.jobId);
        onUploadComplete(response.data.jobId);
      } else {
        alert('Upload failed. Please try again.');
        setUploading(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="uploader-container">
      <div className="upload-box">
        <h2>Upload Your Screen Recording</h2>
        
        <div className="upload-area">
          <label className="file-input-label">
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange}
              disabled={uploading}
            />
            <div className="file-input-content">
              <div className="upload-icon">📁</div>
              <p>Click to select video file</p>
              <p className="file-types">MP4, MOV, AVI, WebM</p>
            </div>
          </label>
          
          {file && (
            <div className="file-info">
              <p>📼 Selected: {file.name}</p>
              <p>📏 Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="upload-button"
        >
          {uploading ? 'Processing...' : 'Upload & Process with AI'}
        </button>
        
        {previewUrl && (
          <div className="video-preview">
            <h4>Preview:</h4>
            <video 
              src={previewUrl} 
              controls 
              width="100%"
              style={{ maxWidth: '500px', borderRadius: '8px' }}
            />
          </div>
        )}
        
        <div className="upload-tips">
          <h4>💡 Tips:</h4>
          <ul>
            <li>Keep videos under 5 minutes for best results</li>
            <li>Record in 720p or higher resolution</li>
            <li>Speak clearly for accurate transcription</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Uploader;