import "./Navbar.css";

function Navbar({ theme, toggleTheme }) {
  return (
    <nav className="navbar">

      <div className="navbar-logo">
        📄 DocuMind AI
      </div>

      <div className="navbar-actions">

        <button
          className="theme-toggle"
          onClick={toggleTheme}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

      </div>

    </nav>
  );
}

export default Navbar;