import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Leaf,
  ArrowRight,
  CheckCircle2,
  Users,
  BarChart3,
  Droplets,
  Fingerprint,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  HeartPulse,
  ExternalLink,
  X
} from 'lucide-react';
import wellnessImg from '../assets/wellness_illustration.jpg';
import logoImg from '../assets/logo.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLegalModal, setActiveLegalModal] = useState(null);
  const [showAccessNotice, setShowAccessNotice] = useState(Boolean(location.state?.authNotice));

  useEffect(() => {
    if (location.state?.authNotice) setShowAccessNotice(true);
  }, [location.key, location.state]);

  const closeAccessNotice = () => {
    setShowAccessNotice(false);
    navigate('/', { replace: true, state: null });
  };

  useEffect(() => {
    if (!activeLegalModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveLegalModal(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeLegalModal]);

  const legalSections = activeLegalModal === 'privacy'
    ? [
        { title: 'Information used', body: 'Wellcare uses client profile details, attendance records, visit history, and alkaline session totals to provide and manage wellness services.' },
        { title: 'How information is used', body: 'These records support client services, attendance tracking, and user-specific reports within the Wellcare system.' },
        { title: 'Questions', body: 'Contact the Wellcare team through our Facebook page if you have questions about privacy or your account.' },
      ]
    : [
        { title: 'Account use', body: 'Keep your account details accurate and your login credentials private. Use the Wellcare system only for authorized purposes.' },
        { title: 'Wellness records', body: 'Visit and session information reflects records entered into the system by authorized users.' },
        { title: 'Service availability', body: 'Wellcare supports wellness-center administration and record keeping. System features may change as the service is maintained.' },
      ];

  return (
    <div className="landing-root">
      
      {/* ── 1. NAVBAR ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => navigate('/')}>
            <img src={logoImg} alt="WellCare Logo" draggable={false} style={{ height: '36px', width: '36px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 2px 8px rgba(4,106,56,0.18)', marginRight: '8px', userSelect: 'none' }} />
            WELLCARE
          </div>
          <div className="landing-nav-links">
            <a href="#hero" className="landing-link">Home</a>
            <a href="#about" className="landing-link">About</a>
            <a href="#services" className="landing-link">Services</a>
            <a href="#contact" className="landing-link">Contact</a>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* ── 2. HERO SECTION ── */}
      <section id="hero" className="hero-section">
        <div className="hero-blob blob-1" />
        <div className="hero-blob blob-2" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <Sparkles size={14} style={{ marginRight: '6px' }} /> Smart Wellness System
          </div>
          
          <h1 className="hero-title">
            YOUR WELLNESS,<br />
            <span className="hero-title-accent">OUR CARE.</span>
          </h1>
          
          <p className="hero-desc">
            A smarter and simpler way to manage your wellness visits, attendance, and client information.
          </p>

          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={() => navigate('/login')}>
              Get Started <ArrowRight size={18} />
            </button>
            <a href="#services" className="btn-ghost btn-lg">
              Learn More
            </a>
          </div>
        </div>

        {/* Wellness / Therapy Illustration Container */}
        <div className="hero-illustration-container">
          <div className="illustration-card">
            <img
              src={wellnessImg}
              alt="Wellness / Therapy Illustration"
              className="wellness-illustration-img"
              draggable={false}
            />
            <div className="illustration-badge">
              <HeartPulse size={18} color="var(--emerald-600)" />
              <span>Wellness &amp; Therapy Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. WHY CHOOSE WELLCARE ── */}
      <section id="services" className="wellness-section">
        <div className="section-inner">
          <span className="section-eyebrow">Key Advantages</span>
          <h2 className="section-title">WHY CHOOSE WELLCARE</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-badge icon-green">
                <Fingerprint size={28} />
              </div>
              <h3 className="feature-title">Easy Attendance</h3>
              <p className="feature-desc">
                Instant biometric fingerprint check-in eliminates physical cards, paper logs, and long queues.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge icon-emerald">
                <Users size={28} />
              </div>
              <h3 className="feature-title">Client Management</h3>
              <p className="feature-desc">
                Organized client profiles with contact details, emergency information, and visit history.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge icon-teal">
                <BarChart3 size={28} />
              </div>
              <h3 className="feature-title">Smart Reports</h3>
              <p className="feature-desc">
                Real-time attendance rates, daily visits, absence tracking, and exportable summary analytics.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge icon-blue">
                <Droplets size={28} />
              </div>
              <h3 className="feature-title">Wellness Tracking</h3>
              <p className="feature-desc">
                Dedicated tracking for alkaline therapy water sessions and personalized wellness activity logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SIMPLE. SMART. WELLNESS. (WORKFLOW BANNER) ── */}
      <section className="banner-workflow-section">
        <div className="section-inner">
          <h2 className="banner-workflow-title">SIMPLE. SMART. WELLNESS.</h2>
          
          <div className="workflow-sequence">
            {[
              { label: 'Register', desc: 'Create client profile & fingerprint' },
              { label: 'Visit', desc: 'Arrive at the wellness center' },
              { label: 'Record', desc: 'Biometric scan & session log' },
              { label: 'Monitor', desc: 'Real-time analytics & reports' },
            ].map((step, idx) => (
              <React.Fragment key={step.label}>
                <div className="workflow-step-pill">
                  <div className="workflow-step-num">0{idx + 1}</div>
                  <div className="workflow-step-text">{step.label}</div>
                  <div className="workflow-step-sub">{step.desc}</div>
                </div>
                {idx < 3 && <ChevronRight className="workflow-arrow-separator" size={24} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. ABOUT WELLCARE ── */}
      <section id="about" className="about-section">
        <div className="section-inner">
          <span className="section-eyebrow">Our Mission</span>
          <h2 className="section-title">ABOUT WELLCARE</h2>
          <p className="about-lead">
            Helping wellness centers manage clients and attendance more efficiently.
          </p>
          <p className="section-desc">
            WELLCARE helps wellness centers manage client profiles, attendance, visits, and alkaline therapy sessions in one digital system, making everyday records easier to organize and review.
          </p>
        </div>
      </section>

      {/* ── 6. GET STARTED CTA BUTTON SECTION ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to experience smarter wellness management?</h2>
          <p className="cta-desc">
            Join WellCare today to streamline attendance, therapy sessions, and client records.
          </p>
          <button className="cta-btn" onClick={() => navigate('/login')}>
            Get Started <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── 7. FOOTER ── */}
      <footer id="contact" className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="logo-leaf">🌿</span> WELLCARE
          </div>
          <div className="landing-footer-links">
            <button type="button" className="footer-link landing-legal-trigger" onClick={() => setActiveLegalModal('privacy')}>Privacy Policy</button>
            <span className="footer-sep">|</span>
            <button type="button" className="footer-link landing-legal-trigger" onClick={() => setActiveLegalModal('terms')}>Terms of Service</button>
            <span className="footer-sep">|</span>
            <a
              href="https://web.facebook.com/profile.php?id=61586535096801"
              className="footer-link landing-facebook-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact us on Facebook <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </footer>

      {activeLegalModal && (
        <div className="modal-overlay" onClick={() => setActiveLegalModal(null)}>
          <section
            className="modal-card landing-legal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-legal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="landing-legal-header">
              <h2 id="landing-legal-title" className="modal-title">
                {activeLegalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h2>
              <button type="button" className="landing-legal-close" onClick={() => setActiveLegalModal(null)} aria-label="Close dialog">
                <X size={20} />
              </button>
            </div>
            <div className="landing-legal-content">
              {legalSections.map((section) => (
                <div key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </div>
              ))}
            </div>
            <button type="button" className="btn-primary landing-legal-done" onClick={() => setActiveLegalModal(null)}>
              Close
            </button>
          </section>
        </div>
      )}

      {showAccessNotice && (
        <div className="modal-overlay" draggable={false} onDragStart={event => event.preventDefault()} onMouseDown={event => { if (event.target === event.currentTarget) closeAccessNotice(); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="access-notice-title" aria-describedby="access-notice-description" draggable={false} onDragStart={event => event.preventDefault()} style={{ width: 'min(100% - 32px, 440px)', padding: '30px', borderRadius: 20, background: '#fff', boxShadow: '0 24px 70px rgba(5, 45, 30, 0.28)', textAlign: 'center', userSelect: 'none', WebkitUserSelect: 'none' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 18px', display: 'grid', placeItems: 'center', borderRadius: 20, color: '#047857', background: 'linear-gradient(145deg, #e9f8ef, #d5f1e1)', border: '1px solid rgba(4,106,56,0.12)' }}>
              <ShieldCheck size={32} strokeWidth={1.8} />
            </div>
            <p style={{ margin: '0 0 8px', color: '#047857', fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase' }}>Account access</p>
            <h2 id="access-notice-title" style={{ margin: '0 0 10px', color: '#123b2a', fontSize: '1.45rem', lineHeight: 1.25, fontWeight: 800 }}>Login required</h2>
            <p id="access-notice-description" style={{ margin: '0 auto', maxWidth: 340, color: '#61736a', fontSize: '0.94rem', lineHeight: 1.65 }}>Please log in before accessing this page. Your session may have ended.</p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
              <button type="button" className="btn-logout" onClick={closeAccessNotice}>Stay on Landing Page</button>
              <button type="button" className="btn-primary" onClick={() => { setShowAccessNotice(false); navigate('/login', { state: null }); }}>Go to Login <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }} /></button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
