import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Download, ExternalLink, Moon, Sun, Search, RefreshCw } from 'lucide-react';

function App() {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClips();
  }, []);

  const fetchClips = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clips');
      if (!response.ok) throw new Error('Database not found');
      const data = await response.json();
      setClips(data);
    } catch (err) {
      console.log('Static preview mode...');
      setClips([
        { title: "Khan Sir: The Truth About Jobs", videoId: "sX6gEwH-SA4", driveLink: "#", layout: "letterbox", processedAt: new Date().toISOString() },
        { title: "Education System Breakdown", videoId: "sX6gEwH-SA4", driveLink: "#", layout: "center", processedAt: new Date().toISOString() },
        { title: "Why Innovation Fails", videoId: "sX6gEwH-SA4", driveLink: "#", layout: "split", processedAt: new Date().toISOString() },
        { title: "The Future of Politics", videoId: "sX6gEwH-SA4", driveLink: "#", layout: "letterbox", processedAt: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredClips = clips.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <header className="header">
        <div className="header-title">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            ViralForge <span style={{ opacity: 0.4 }}>Studio</span>
          </motion.h1>
          <p>High-performance content library powered by Gemini AI.</p>
        </div>
        
        <button className="btn btn-outline" style={{ borderRadius: '8px' }} onClick={fetchClips}>
          <RefreshCw size={16} /> Sync Library
        </button>
      </header>

      <div className="search-container" style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
        <input 
          type="text" 
          placeholder="Filter your collection..." 
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ fontFamily: 'Source Serif 4', color: '#92928F' }}>Opening Library...</p>
        </div>
      ) : (
        <motion.div 
          className="grid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
        >
          <AnimatePresence>
            {filteredClips.map((clip, idx) => (
              <motion.div 
                key={idx}
                className="clip-card"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                layout
              >
                <div className="clip-thumbnail">
                  <Play className="play-icon" size={32} strokeWidth={1.5} />
                </div>
                <div className="clip-content">
                  <h3 className="clip-title">{clip.title}</h3>
                  
                  <div className="clip-meta">
                    <span className="badge">{clip.layout}</span>
                    <span>{new Date(clip.processedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="actions-overlay">
                    <a href={clip.driveLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                      <Download size={14} /> Drive
                    </a>
                    <a href={`https://youtube.com/watch?v=${clip.videoId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" title="Watch Original">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {filteredClips.length === 0 && !loading && (
        <div style={{ textAlign: 'center', marginTop: '6rem', opacity: 0.3 }}>
           <p style={{ fontFamily: 'Source Serif 4', fontSize: '1.2rem' }}>No matching clips found.</p>
        </div>
      )}

      <footer style={{ marginTop: '8rem', paddingBottom: '2rem', textAlign: 'center', opacity: 0.2, fontSize: '0.75rem' }}>
        <p>VIRALFORGE PRO v1.0 • PRIVATELY HOSTED • 2026</p>
      </footer>
    </div>
  );
}

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
