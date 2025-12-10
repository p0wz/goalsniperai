import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Pricing from './pages/Pricing';

import { useState, useEffect } from 'react';

function ClickCursorEffect() {
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    const handleClick = (e) => {
      const id = Date.now();
      setClicks((prev) => [...prev, { id, x: e.pageX, y: e.pageY }]);
      setTimeout(() => {
        setClicks((prev) => prev.filter((c) => c.id !== id));
      }, 800);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {clicks.map((click) => (
        <div
          key={click.id}
          className="absolute w-4 h-4 rounded-full bg-accent/80 border border-white/50 animate-ping"
          style={{ top: click.y - 8, left: click.x - 8 }}
        />
      ))}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClickCursorEffect />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
