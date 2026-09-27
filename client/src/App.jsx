import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import UploadModal from './components/UploadModal';
import Home from './pages/Home';
import Watch from './pages/Watch';
import { SocketProvider } from './context/SocketContext';

export default function App() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
          <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home onOpenUpload={() => setIsUploadOpen(true)} />} />
              <Route path="/watch/:id" element={<Watch />} />
            </Routes>
          </main>

          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            onUploadSuccess={() => {
              // Can trigger reload or socket handles it
            }}
          />
        </div>
      </Router>
    </SocketProvider>
  );
}
