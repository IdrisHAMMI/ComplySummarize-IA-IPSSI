import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import History from "./pages/History";
import About from "./pages/About";
import Header from "./components/Header";
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "";
  }, [darkMode]);

  return (
    <Router>
      {/* ✅ Barre de navigation en haut */}
      <Header darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />

      {/* ✅ Contenu principal centré */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
