import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [shortUrl, setShortUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [urls, setUrls] = useState([]);
  const [selectedAnalytics, setSelectedAnalytics] = useState(null);

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/urls`);
      const data = await response.json();
      setUrls(data.urls || []);
    } catch (err) {
      console.error('Failed to fetch URLs:', err);
    }
  };

  const shortenUrl = async () => {
    if (!url) return;
    
    setLoading(true);
    setError('');
    setShortUrl(null);

    try {
      const response = await fetch(`${API_BASE}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          custom_alias: customAlias || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setShortUrl(data);
        setUrl('');
        setCustomAlias('');
        fetchUrls();
      } else {
        setError(data.error || 'Failed to shorten URL');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure Flask is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const fetchAnalytics = async (shortCode) => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/${shortCode}`);
      const data = await response.json();
      setSelectedAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h1>URL Shortener</h1>
          <p className="subtitle">Transform long URLs into short, shareable links</p>
        </div>

        <div className="card main-card">
          <div className="form-group">
            <label>Enter your long URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/very/long/url"
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Custom alias (optional)</label>
            <input
              type="text"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              placeholder="my-custom-link"
              className="input"
            />
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            onClick={shortenUrl}
            disabled={loading || !url}
            className="btn btn-primary"
          >
            {loading ? 'Shortening...' : 'Shorten URL'}
          </button>

          {shortUrl && (
            <div className="success-box">
              <p className="success-text">✓ URL shortened successfully!</p>
              <div className="result-url">
                <a
                  href={shortUrl.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="short-link"
                >
                  {shortUrl.short_url}
                </a>
                <button
                  onClick={() => copyToClipboard(shortUrl.short_url)}
                  className="btn-icon"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">
            📊 Your Shortened URLs
          </h2>

          {urls.length === 0 ? (
            <p className="empty-state">No URLs yet. Create your first short link above!</p>
          ) : (
            <div className="url-list">
              {urls.map((item) => (
                <div key={item.short_code} className="url-item">
                  <div className="url-content">
                    <div className="url-header">
                      <a
                        href={item.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="url-short"
                      >
                        {item.short_url}
                      </a>
                      <button
                        onClick={() => copyToClipboard(item.short_url)}
                        className="btn-copy"
                        title="Copy"
                      >
                        📋
                      </button>
                    </div>
                    <p className="url-original" title={item.original_url}>
                      → {item.original_url}
                    </p>
                    <div className="url-meta">
                      <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                      <span>Clicks: {item.click_count}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchAnalytics(item.short_code)}
                    className="btn btn-secondary"
                  >
                    Analytics
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedAnalytics && (
          <div className="modal-overlay" onClick={() => setSelectedAnalytics(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Analytics</h3>
                <button
                  onClick={() => setSelectedAnalytics(null)}
                  className="modal-close"
                >
                  ✕
                </button>
              </div>

              <div className="modal-content">
                <div className="info-box info-primary">
                  <p className="info-label">Short URL</p>
                  <p className="info-value">{API_BASE}/{selectedAnalytics.short_code}</p>
                </div>

                <div className="info-box info-secondary">
                  <p className="info-label">Original URL</p>
                  <p className="info-value">{selectedAnalytics.original_url}</p>
                </div>

                <div className="stats-grid">
                  <div className="stat-card stat-green">
                    <p className="stat-label">Total Clicks</p>
                    <p className="stat-value">{selectedAnalytics.total_clicks}</p>
                  </div>
                  <div className="stat-card stat-blue">
                    <p className="stat-label">Created</p>
                    <p className="stat-date">
                      {new Date(selectedAnalytics.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedAnalytics.recent_clicks && selectedAnalytics.recent_clicks.length > 0 && (
                  <div className="clicks-section">
                    <h4>Recent Clicks</h4>
                    <div className="clicks-list">
                      {selectedAnalytics.recent_clicks.map((click, idx) => (
                        <div key={idx} className="click-item">
                          {new Date(click.timestamp).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;