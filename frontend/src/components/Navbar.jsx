import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        📄 <span>DocuMind AI</span>
      </div>

      <div className="nav-right">
        AI Powered PDF Assistant
      </div>
    </nav>
  );
}

export default Navbar;