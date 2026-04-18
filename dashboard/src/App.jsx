import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Download, ExternalLink, Moon, Sun, Search, RefreshCw } from 'lucide-react';

function App() {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClips();
    // Default to dark if user prefers
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  const fetchClips = async () => {
    setLoading(true);
    try {
      // In production, this calls our Vercel API
      const response = await fetch('/api/clips');
      if (!response.ok) throw new Error('Database not found');
      const data = await response.json();
      setClips(data);
    } catch (err) {
      console.log('Using mock data for development...', err.message);
      // MOCK DATA for preview
      setClips([
        {
          title: "Khan Sir on Education Reality",
          videoId: "sX6gEwH-SA4",
          driveLink: "#",
          layout: "letterbox",
          processedAt: new Date().toISOString()
        },
        {
          title: "The Logic of Success",
          videoId: "sX6gEwH-SA4",
          driveLink: "#",
          layout: "center",
          processedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredClips = clips.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-wrapper" data-theme={isDark ? 'dark' : 'light'}>
      <div className="container">
        <header className="header">
          <div className="brand">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              ViralForge <span style={{ fontWeight: 400, opacity: 0.6 }}>Clips</span>
            </motion.h1>
            <p>Your premium content vault, synchronized from the cloud.</p>
          </div>
          
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setIsDark(!isDark)}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="search-bar" style={{ marginBottom: '3rem', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={20} />
          <input 
            type="text" 
            placeholder="Search your library..." 
            className="btn btn-secondary"
            style={{ width: '100%', paddingLeft: '3rem', height: '3.5rem', textAlign: 'left', borderRadius: '12px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p className="serif">Fetching your viral desk...</p>
          </div>
        ) : (
          <motion.div 
            className="grid"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            <AnimatePresence>
              {filteredClips.map((clip, idx) => (
                <motion.div 
                  key={idx}
                  className="clip-card"
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    visible: { opacity: 1, scale: 1 }
                  }}
                  layout
                >
                  <div className="clip-thumbnail">
                    <Play size={40} strokeWidth={1.5} opacity={0.3} />
                  </div>
                  <div className="clip-content">
                    <div className="tag" style={{ marginBottom: '1rem' }}>{clip.layout}</div>
                    <h3 className="clip-title">{clip.title}</h3>
                    <div className="clip-meta">
                      <span>{new Date(clip.processedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>ID: {clip.videoId}</span>
                    </div>
                    <div className="clip-actions">
                      <a href={clip.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        <Download size={16} /> Open Drive
                      </a>
                      <a href={`https://youtube.com/watch?v=${clip.videoId}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        <ExternalLink size={16} /> Original Video
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredClips.length === 0 && !loading && (
          <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.5 }}>
             <p className="serif" style={{ fontSize: '1.2rem' }}>No clips found yet. Run your local engine to populate the database.</p>
          </div>
        )}

        <footer style={{ marginTop: '8rem', textAlign: 'center', opacity: 0.4, fontSize: '0.8rem' }}>
          <p>© 2026 ViralForge Intelligence. Built with Claude Aesthetics.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
