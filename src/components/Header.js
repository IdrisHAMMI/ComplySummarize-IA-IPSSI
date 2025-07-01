import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";

const Header = ({ darkMode, toggleDarkMode }) => {
    return (
        <header className="header">
            <nav className="navbar">
                <div className="nav-links">
                    <Link to="/">Accueil</Link>
                    <Link to="/history">Historique</Link>
                    <Link to="/about">À propos</Link>
                </div>
                <button onClick={toggleDarkMode} className="dark-mode-toggle">
                    {darkMode ? "🌞 Mode clair" : "🌙 Mode sombre"}
                </button>
            </nav>
        </header>
    );
};

export default Header;
