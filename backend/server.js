const express = require("express");
const cors = require("cors");
const multer = require("multer");
const PDFParser = require("pdf-parse");
const fs = require("fs");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// URL du service IA Docker
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://distilbart:8080';

// Middleware
app.use(cors());
app.use(express.json());

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// File upload setup with .pdf extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}.pdf`); // Ensure .pdf extension
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes("pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format, only PDFs allowed"), false);
    }
  }
});

// Fonction pour diviser le texte en chunks si nécessaire
function splitTextIntoChunks(text, maxLength = 1024) {
  const words = text.split(' ');
  const chunks = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + ' ' + word).split(' ').length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + word;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// Appel au service IA Docker local
const summarizeText = async (text) => {
  try {
    // Vérifier si le texte est trop long et le diviser si nécessaire
    const chunks = splitTextIntoChunks(text, 800); // Limite à 800 mots pour être sûr
    const summaries = [];

    for (const chunk of chunks) {
      const response = await axios.post(
        `${AI_SERVICE_URL}/summarize`,
        { 
          inputs: chunk, 
          parameters: { 
            max_length: 200, 
            min_length: 50,
            do_sample: false 
          } 
        },
        { 
          timeout: 30000, // 30 secondes de timeout
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log("API response:", response.data); // Debug
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        summaries.push(response.data[0].summary_text);
      }
    }

    // Si plusieurs résumés, les combiner
    if (summaries.length > 1) {
      const combinedSummary = summaries.join(' ');
      // Si le résumé combiné est trop long, le résumer à nouveau
      if (combinedSummary.split(' ').length > 300) {
        return await summarizeText(combinedSummary);
      }
      return combinedSummary;
    }

    return summaries[0] || "No summary returned";
  } catch (error) {
    console.error("API error:", error.message, error.response?.data);
    
    if (error.code === 'ECONNREFUSED') {
      return "Error: Cannot connect to AI service. Please ensure the Docker container is running.";
    }
    
    if (error.response?.status === 503) {
      return "Model is loading, please try again in a few moments.";
    }
    
    return "Error summarizing text: " + error.message;
  }
};

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  if (!req.file.mimetype.includes("pdf")) return res.status(400).json({ error: "Invalid file format" });
  
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await PDFParser(dataBuffer);
    
    // Prendre plus de texte mais pas tout pour éviter de surcharger
    const text = pdfData.text.slice(0, 5000); // Augmenté à 5000 caractères
    console.log("Extracted text length:", text.length); // Debug
    
    const summary = await summarizeText(text);
    
    // Améliorer l'extraction des points clés
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, 5).map((sentence, i) => {
      return `Point ${i + 1}: ${sentence.trim()}`;
    });
    
    const actions = [
      "Review document for compliance",
      "Share summary with team",
      "Archive the original document",
      "Schedule follow-up if needed"
    ];
    
    res.json({ 
      summary, 
      keyPoints,
      actions,
      metadata: {
        fileName: req.file.originalname,
        pageCount: pdfData.numpages || 0,
        textLength: pdfData.text.length,
        processingTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  } finally {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Failed to delete file:", err);
      });
    }
  }
});

// Test API route
app.get("/test-api", async (req, res) => {
  const testText = "Project management involves planning, executing, and monitoring tasks to achieve goals. Effective project managers use tools like Jira or Trello to track progress. Automation tools, such as CI/CD pipelines, can streamline repetitive processes, saving time and reducing errors in software development. The key to successful project management lies in clear communication, realistic timeline setting, and continuous adaptation to changing requirements. Modern project management also emphasizes agile methodologies, which allow for iterative development and quick response to feedback.";
  
  try {
    const summary = await summarizeText(testText);
    res.json({ 
      summary,
      serviceUrl: AI_SERVICE_URL,
      status: "Connected to local AI service"
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to call AI service",
      details: error.message,
      serviceUrl: AI_SERVICE_URL
    });
  }
});

// Route pour vérifier la connexion avec le service IA
app.get("/health-check", async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({ 
      apiStatus: "healthy",
      aiService: response.data,
      serviceUrl: AI_SERVICE_URL
    });
  } catch (error) {
    res.status(503).json({ 
      apiStatus: "healthy",
      aiService: "disconnected",
      error: error.message,
      serviceUrl: AI_SERVICE_URL
    });
  }
});

// Basic route
app.get("/", (req, res) => {
  res.json({ 
    message: "ComplySummarize IA Backend",
    version: "1.0.0",
    endpoints: {
      upload: "POST /upload",
      test: "GET /test-api",
      health: "GET /health-check"
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`AI Service URL: ${AI_SERVICE_URL}`);
});