// backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

// Middleware
app.use(cors()); // Allow front-end requests
app.use(express.json());

// Basic route to test server
app.get("/", (req, res) => {
  res.json({ message: "ComplySummarize IA Backend" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));