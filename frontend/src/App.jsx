import { useEffect, useState } from "react";
import Home from "./pages/Home";
import "./App.css";

function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) =>
      prev === "light" ? "dark" : "light"
    );
  };

  return (
    <Home
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}

export default App;