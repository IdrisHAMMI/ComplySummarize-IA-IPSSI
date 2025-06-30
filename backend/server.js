const express = require("express");
  const cors = require("cors");
  const multer = require("multer");
  const PDFParser = require("pdf-parse");
  const fs = require("fs");
  const axios = require("axios");
  const dotenv = require("dotenv");

  dotenv.config();
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // File upload setup
  const upload = multer({ dest: "uploads/" });

  // Hugging Face API call
  const summarizeText = async (text) => {
    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        { inputs: text, parameters: { max_length: 100, min_length: 30 } },
        { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
      );
      console.log("API response:", response.data); // Debug
      if (response.data && response.data[0] && response.data[0].summary_text) {
        return response.data[0].summary_text;
      }
      return "No summary returned by API";
    } catch (error) {
      console.error("API error:", error.message, error.response?.data);
      if (error.response?.status === 429) {
        return "Mock summary due to rate limit";
      }
      if (error.response?.status === 503) {
        return "Model is loading, please try again";
      }
      return "Error summarizing text";
    }
  };

  // Test API route
  app.get("/test-api", async (req, res) => {
    const testText = "Project management involves planning, executing, and monitoring tasks to achieve goals. Effective project managers use tools like Jira or Trello to track progress. Automation tools, such as CI/CD pipelines, can streamline repetitive processes, saving time and reducing errors in software development.";
    try {
      const summary = await summarizeText(testText);
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ error: "Failed to call Hugging Face API" });
    }
  });

  // PDF upload route
  app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!req.file.mimetype.includes("pdf")) return res.status(400).json({ error: "Invalid file format" });

    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await PDFParser(dataBuffer);
      const text = pdfData.text.slice(0, 1000);

      const summary = await summarizeText(text);
      const keyPoints = summary.split(". ").slice(0, 3).map((p, i) => `Point ${i + 1}: ${p}`);
      const actions = ["Review document for compliance", "Share summary with team"];

      res.json({ summary, keyPoints, actions });
    } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Basic route
  app.get("/", (req, res) => {
    res.json({ message: "ComplySummarize IA Backend" });
  });

  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));