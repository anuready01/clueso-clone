// server.js - COMPLETE UPDATED VERSION
console.log('🚀 Starting Clueso Clone Backend...');

// Load environment variables
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Try to load .env
let envLoaded = false;
const envPaths = ['.env', path.join(__dirname, '.env')];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Found .env at: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️  No .env file found. Using simulated AI mode.');
}

console.log('\n🔍 Environment Check:');
console.log('- PORT:', process.env.PORT || '5000 (default)');
console.log('- OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('- AI Mode:', process.env.OPENAI_API_KEY ? 'Real OpenAI (if credits)' : 'Simulated AI');

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();

// IMPORTANT: CORS configuration for video streaming
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
  console.log('📁 Created uploads directory');
}

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Keep original extension
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const uniqueName = `${Date.now()}-${name}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: (req, file, cb) => {
    // Accept video files
    const videoTypes = /mp4|mov|avi|wmv|flv|webm|mkv/;
    const extname = videoTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = videoTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});

// Store jobs in memory
const jobs = {};

// ====================
// API ENDPOINTS
// ====================

// 1. Upload endpoint
app.post('/api/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = `job_${Date.now()}`;
    const videoPath = req.file.path;
    const videoFilename = path.basename(videoPath);
    
    // Create job object
    jobs[jobId] = {
      id: jobId,
      status: 'processing',
      videoPath: videoPath,
      videoUrl: `/uploads/${videoFilename}`,
      videoFilename: videoFilename,
      originalName: req.file.originalname,
      fileSize: (req.file.size / (1024*1024)).toFixed(2) + ' MB',
      steps: [],
      transcript: '',
      enhancedScript: '',
      createdAt: new Date().toISOString(),
      aiMode: 'simulated',
      error: null
    };
    
    console.log(`📥 New upload: ${jobId} - ${req.file.originalname} (${jobs[jobId].fileSize})`);
    
    // Start simulated AI processing
    simulateAIProcessing(jobId);
    
    res.json({ 
      success: true, 
      jobId: jobId, 
      message: 'Video uploaded successfully',
      videoUrl: `/uploads/${videoFilename}`,
      fileInfo: {
        name: req.file.originalname,
        size: jobs[jobId].fileSize,
        type: req.file.mimetype
      }
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message,
      tip: 'Make sure file is a video (MP4, MOV, etc.) under 200MB'
    });
  }
});

// 2. Job status endpoint
app.get('/api/job/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs[jobId];
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Add direct video URL for frontend
  const jobResponse = {
    ...job,
    directVideoUrl: `http://localhost:5000${job.videoUrl}`
  };
  
  res.json(jobResponse);
});

// 3. Test endpoint
app.get('/api/test-openai', (req, res) => {
  console.log('🧪 Testing in SIMULATED AI mode...');
  
  res.json({ 
    status: 'simulated', 
    message: 'Using enhanced simulated AI (no API credits needed)',
    model: 'clueso-simulated-ai',
    features: [
      'Video processing pipeline',
      'Step-by-step tutorial generation',
      'Multiple output formats',
      'Ready for real OpenAI API integration'
    ],
    server: 'Backend running on port 5000',
    timestamp: new Date().toISOString()
  });
});

// 4. List all jobs (for debugging)
app.get('/api/jobs', (req, res) => {
  const jobList = Object.keys(jobs).map(id => ({
    id: id,
    status: jobs[id].status,
    createdAt: jobs[id].createdAt,
    videoName: jobs[id].originalName,
    stepsCount: jobs[id].steps?.length || 0,
    videoUrl: `http://localhost:5000${jobs[id].videoUrl}`
  }));
  
  res.json({
    total: Object.keys(jobs).length,
    jobs: jobList
  });
});

// 5. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    server: 'Clueso Clone Backend',
    endpoints: {
      upload: 'POST /api/upload',
      jobStatus: 'GET /api/job/:id',
      testAI: 'GET /api/test-openai',
      jobsList: 'GET /api/jobs',
      health: 'GET /api/health'
    },
    stats: {
      totalJobs: Object.keys(jobs).length,
      activeJobs: Object.values(jobs).filter(j => j.status === 'processing').length,
      completedJobs: Object.values(jobs).filter(j => j.status === 'completed').length,
      uploadsDir: fs.existsSync('uploads') ? 'Exists' : 'Missing'
    }
  });
});

// ====================
// FILE SERVING
// ====================

// Serve uploaded files with proper headers for video streaming
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, filePath) => {
    // Set proper content type for videos
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (filePath.endsWith('.avi')) {
      res.setHeader('Content-Type', 'video/x-msvideo');
    }
    
    // Allow video streaming
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// ====================
// AI PROCESSING
// ====================

// ENHANCED SIMULATED AI PROCESSING
function simulateAIProcessing(jobId) {
  const job = jobs[jobId];
  if (!job) return;
  
  console.log(`🤖 SIMULATED AI processing ${jobId}...`);
  
  // Multiple realistic tutorial templates
  const tutorialTemplates = [
    {
      id: 'browser_setup',
      title: "Browser Dark Mode Setup",
      category: "UI Customization",
      description: "Learn how to enable dark mode in your web browser",
      steps: [
        "Open your web browser (Chrome, Firefox, Edge, etc.)",
        "Click the three-dot menu icon in the top-right corner",
        "Select 'Settings' from the dropdown menu",
        "Navigate to 'Appearance' or 'Themes' section",
        "Find the 'Dark mode' toggle switch",
        "Enable dark mode by toggling the switch",
        "Close settings and refresh your tabs",
        "Enjoy the new dark theme interface"
      ]
    },
    {
      id: 'file_organization',
      title: "File Organization System",
      category: "Productivity",
      description: "Create an efficient file organization system",
      steps: [
        "Open File Explorer from your taskbar",
        "Navigate to your Documents folder",
        "Create a new folder named 'Sorted_Projects'",
        "Inside, create subfolders: 'Work', 'Personal', 'Archive'",
        "Select multiple files by holding Ctrl key",
        "Drag and drop files into appropriate folders",
        "Use descriptive names for easy searching",
        "Right-click main folder and 'Pin to Quick Access'"
      ]
    },
    {
      id: 'software_install',
      title: "Software Installation Guide",
      category: "Setup",
      description: "Step-by-step software installation process",
      steps: [
        "Visit the official website of the software",
        "Click the 'Download' button for your OS",
        "Run the downloaded installer file",
        "Accept the license agreement terms",
        "Choose installation directory location",
        "Select additional components if needed",
        "Click 'Install' and wait for completion",
        "Launch the software from Start Menu"
      ]
    }
  ];
  
  // Pick a random template
  const template = tutorialTemplates[Math.floor(Math.random() * tutorialTemplates.length)];
  
  // Create steps with realistic timestamps
  const steps = template.steps.map((text, index) => {
    const baseTime = 5; // Start at 5 seconds
    const increment = 7; // 7 seconds between steps
    const timestampSeconds = baseTime + (index * increment);
    const minutes = Math.floor(timestampSeconds / 60);
    const seconds = timestampSeconds % 60;
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Different colors for each step
    const colors = ['3b82f6', '10b981', '8b5cf6', 'f59e0b', 'ef4444', '06b6d4', '8b5cf6', 'ec4899'];
    const color = colors[index % colors.length];
    
    // Step types for variety
    const stepTypes = ['setup', 'action', 'configuration', 'verification', 'completion'];
    const stepType = stepTypes[index % stepTypes.length];
    
    return {
      id: index + 1,
      stepNumber: index + 1,
      timestamp: timestamp,
      text: text,
      screenshot: `https://placehold.co/600x400/${color}/ffffff?text=Step+${index + 1}&font=roboto`,
      thumbnail: `https://placehold.co/300x200/${color}/ffffff?text=Step+${index + 1}`,
      color: color,
      type: stepType,
      duration: `${increment}s`,
      estimatedTime: timestamp
    };
  });
  
  // Generate realistic transcript
  const transcript = generateRealisticTranscript(template, job.originalName);
  
  // Simulate processing delay (3-6 seconds for realism)
  const delay = 3000 + Math.random() * 3000;
  const startTime = Date.now();
  
  console.log(`📊 Using template: "${template.title}" (${template.category})`);
  console.log(`⏳ Simulating AI processing for ${Math.round(delay/1000)} seconds...`);
  
  setTimeout(() => {
    const processingTime = Date.now() - startTime;
    
    job.status = 'completed';
    job.steps = steps;
    job.templateId = template.id;
    job.templateTitle = template.title;
    job.templateCategory = template.category;
    job.templateDescription = template.description;
    job.transcript = transcript;
    job.enhancedScript = `# ${template.title}\n\n## Overview\n${template.description}\n\n## Steps\n${steps.map(s => `${s.id}. ${s.text}`).join('\n')}\n\n## Summary\nComplete this tutorial in approximately ${steps.length * 7} seconds.`;
    job.completedAt = new Date().toISOString();
    job.aiMode = 'simulated_enhanced';
    job.processingTime = processingTime;
    job.totalSteps = steps.length;
    job.directVideoUrl = `http://localhost:5000${job.videoUrl}`;
    
    console.log(`✅ Simulated AI complete for ${jobId}`);
    console.log(`📈 Generated: ${steps.length} steps in ${processingTime}ms`);
    console.log(`🎯 Template: ${template.title}`);
    console.log(`🔗 Video URL: ${job.directVideoUrl}`);
  }, delay);
}

// Generate realistic fake transcript
function generateRealisticTranscript(template, videoName) {
  const phrases = [
    "Alright, let me show you how to",
    "First thing you'll want to do is",
    "The key here is to make sure you",
    "Next, we're going to",
    "This part is important because",
    "Once that's done, you can",
    "Finally, to wrap things up",
    "And that's basically it for"
  ];
  
  let transcript = `# Transcript: ${template.title}\n\n`;
  transcript += `Video: ${videoName || 'screen_recording.mp4'}\n`;
  transcript += `Category: ${template.category}\n\n`;
  
  transcript += "**NARRATOR:** ";
  transcript += `Today I'll show you how to ${template.title.toLowerCase()}. `;
  transcript += "This is a straightforward process that should take just a few minutes.\n\n";
  
  template.steps.forEach((step, index) => {
    const phrase = phrases[index % phrases.length];
    transcript += `**Step ${index + 1} (${getTimecode(index)}):** ${phrase} ${step.toLowerCase()}.\n`;
    
    // Add some thinking pauses
    if (index % 3 === 0) {
      transcript += "[brief pause]\n";
    }
  });
  
  transcript += `\n**CONCLUSION:** And that's how you ${template.title.toLowerCase()}. `;
  transcript += "Thanks for watching!\n";
  
  return transcript;
}

function getTimecode(stepIndex) {
  const seconds = 5 + (stepIndex * 7);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ====================
// ERROR HANDLING
// ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      upload: 'POST /api/upload',
      jobStatus: 'GET /api/job/:id',
      testAI: 'GET /api/test-openai',
      jobsList: 'GET /api/jobs',
      health: 'GET /api/health',
      videos: 'GET /uploads/:filename'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ====================
// START SERVER
// ====================

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🎉 Backend server running on http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Test AI: http://localhost:${PORT}/api/test-openai`);
  console.log(`📤 Upload: POST http://localhost:${PORT}/api/upload`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
  console.log(`\n💡 Frontend: Open http://localhost:3000`);
  console.log(`🤖 AI Mode: ${process.env.OPENAI_API_KEY ? 'Real OpenAI ready' : 'Enhanced Simulated AI'}`);
  console.log(`📂 Uploads folder: ${path.join(__dirname, 'uploads')}`);
  console.log(`\n✅ Ready to accept video uploads!`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app;