import './App.css'

const topics = [
  {
    number: 1,
    title: 'AI Foundations & GitHub Copilot',
    description:
      'Get started with AI fundamentals and learn how GitHub Copilot transforms your development workflow with intelligent code suggestions.',
    badge: '🏅',
  },
  {
    number: 2,
    title: 'Agentic DevOps with SpecKit',
    description:
      'Discover how to automate your CI/CD pipelines using AI-driven specifications. Turn plain-language specs into GitHub Actions workflows.',
    badge: '🏅',
  },
  {
    number: 3,
    title: 'Building AI Apps with Azure OpenAI',
    description:
      'Build intelligent applications using Azure OpenAI Service, including chat completions, embeddings, and prompt engineering.',
    badge: '🏅',
  },
  {
    number: 4,
    title: 'Retrieval-Augmented Generation (RAG)',
    description:
      'Implement RAG patterns to ground your AI applications in your own data using Azure AI Search and vector databases.',
    badge: '🏅',
  },
  {
    number: 5,
    title: 'AI Agents & Multi-Agent Systems',
    description:
      'Design and deploy autonomous AI agents that can plan, use tools, and collaborate to complete complex tasks end-to-end.',
    badge: '🏅',
  },
  {
    number: 6,
    title: 'Responsible AI & Production Deployment',
    description:
      'Learn best practices for deploying AI responsibly—safety, fairness, monitoring, and scaling production AI workloads on Azure.',
    badge: '🏅',
  },
]

function TopicCard({ topic }) {
  return (
    <div className="topic-card">
      <div className="topic-number">Episode {topic.number}</div>
      <h3>{topic.title}</h3>
      <p>{topic.description}</p>
      <span className="badge">{topic.badge} Earn a LinkedIn Badge</span>
    </div>
  )
}

function App() {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-ms">Microsoft</span>
            <span className="logo-divider">|</span>
            <span className="logo-reactor">Reactor</span>
          </div>
          <nav className="nav">
            <a href="#about">About</a>
            <a href="#topics">Topics</a>
            <a href="#presenters">Presenters</a>
            <a
              href="https://aka.ms/On-demandAIGeniusSeries"
              target="_blank"
              rel="noreferrer"
              className="nav-cta"
            >
              Watch On Demand
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Microsoft Reactor Series S-1453</div>
          <h1>
            Microsoft <span className="accent">AI Genius</span>
          </h1>
          <p className="hero-subtitle">
            A six-part progressive course taking you from AI newcomer to AI pro.
            Advance your skills with cutting-edge AI tech and tools presented by
            top Microsoft experts.
          </p>
          <div className="hero-actions">
            <a
              href="https://aka.ms/On-demandAIGeniusSeries"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Start Learning Free
            </a>
            <a href="#topics" className="btn btn-secondary">
              Explore Topics
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <strong>6</strong>
              <span>Topics</span>
            </div>
            <div className="stat">
              <strong>6</strong>
              <span>LinkedIn Badges</span>
            </div>
            <div className="stat">
              <strong>Free</strong>
              <span>Access</span>
            </div>
          </div>
        </div>
        <div className="hero-graphic" aria-hidden="true">
          <div className="ai-orb">
            <span>AI</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="about">
        <div className="container">
          <h2>What is AI Genius?</h2>
          <div className="about-grid">
            <div className="about-card">
              <div className="about-icon">🎯</div>
              <h3>Who should attend</h3>
              <p>
                Data, AI, security and machine learning developers who want to
                upskill in cutting-edge AI and lead innovation in their
                organization.
              </p>
            </div>
            <div className="about-card">
              <div className="about-icon">📚</div>
              <h3>What to expect</h3>
              <p>
                A six-part progressive course with new AI topics. Each session
                is kicked off by Microsoft AI rock stars Priyanka Vergadia and
                Vinayak Hegde.
              </p>
            </div>
            <div className="about-card">
              <div className="about-icon">🛠️</div>
              <h3>Hands-on practice</h3>
              <p>
                Follow along with projects for hands-on practice. Gain access to
                Freemium GitHub tech and tools and a developer community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section id="topics" className="topics">
        <div className="container">
          <h2>Course Topics</h2>
          <p className="section-subtitle">
            Complete all six topics or focus on the ones most relevant to you.
            We strongly recommend completing all of them.
          </p>
          <div className="topics-grid">
            {topics.map((topic) => (
              <TopicCard key={topic.number} topic={topic} />
            ))}
          </div>
        </div>
      </section>

      {/* Presenters */}
      <section id="presenters" className="presenters">
        <div className="container">
          <h2>Your Presenters</h2>
          <p className="section-subtitle">
            Learn from Microsoft&apos;s top AI experts and rock stars
          </p>
          <div className="presenters-grid">
            <div className="presenter-card">
              <div className="presenter-avatar">PV</div>
              <h3>Priyanka Vergadia</h3>
              <p>Microsoft AI Expert</p>
            </div>
            <div className="presenter-card">
              <div className="presenter-avatar">VH</div>
              <h3>Vinayak Hegde</h3>
              <p>Microsoft AI Expert</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <h2>Ready to become an AI pro?</h2>
          <p>Missed a session? No problem — watch on demand anytime.</p>
          <a
            href="https://aka.ms/On-demandAIGeniusSeries"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-large"
          >
            Watch the Full Series →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>
            © {new Date().getFullYear()} Microsoft Corporation. Built with
            Microsoft Reactor ·{' '}
            <a
              href="https://developer.microsoft.com/en-us/reactor/series/s-1453/"
              target="_blank"
              rel="noreferrer"
            >
              Series S-1453
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
