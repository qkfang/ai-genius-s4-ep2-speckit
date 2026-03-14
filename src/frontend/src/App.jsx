import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 AI Genius SpecKit</h1>
        <p>Agentic DevOps — Turn Specs into CI/CD</p>
      </header>
      <main className="app-main">
        <section className="status-card">
          <h2>Backend Status</h2>
          {loading && <p className="loading">Loading...</p>}
          {error && <p className="error">Error: {error}</p>}
          {status && (
            <ul>
              <li>
                <strong>Status:</strong> {status.status}
              </li>
              <li>
                <strong>Environment:</strong> {status.environment}
              </li>
              <li>
                <strong>SpecKit enabled:</strong>{' '}
                {String(status.speckit?.enabled)}
              </li>
              <li>
                <strong>Timestamp:</strong> {status.timestamp}
              </li>
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
