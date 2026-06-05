import { Link } from "react-router-dom";
import logo2 from "../assets/logo2.png";
import "../styles/welcome.css";

export default function Welcome() {
  const email = localStorage.getItem("userEmail") || "";
  const year = new Date().getFullYear();

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }

  return (
    <main className="welcome-page">
      <div className="topbar">
        <div className="top-left">
          <div className="brandline">
            <span className="brand-name">LinkLedger</span>
            <span className="tagline">Where Trust Meets Transparency</span>
          </div>
        </div>

        <div className="top-right">
          <span className="user-pill">
            {email ? `Logged in: ${email}` : "Logged in"}
          </span>

        <Link className="toplink" to="/set-password">Secure</Link>

<button className="toplink" type="button" onClick={logout}>
  Logout
</button>
        </div>
      </div>

      <section className="logo-hero">
        <div className="logo-hero-inner">
          <div className="welcome-kicker">Welcome</div>

  <img
  src={logo2}
  alt="LinkLedger"
  className="hero-logo"
/>
         
        </div>
      </section>

      <main className="wrap">
        <section className="card">
          <div className="small-title">Welcome</div>
          <h1>Clarity. Control. Confidence.</h1>

          <p className="muted">
            This space is yours — designed to give you clarity, confidence, and control in every decision you make.
            No noise. No guesswork. Just the insight you need.
          </p>

          <div className="actions">
            <Link className="btn btn-primary" to="/app/dashboard">
              Proceed to Dashboard
            </Link>

            <a className="btn btn-ghost" href="#about">
              About LinkLedger
            </a>
          </div>

          <div className="chips">
            <div className="chip">
              <div className="chip-title">Secure</div>
              <div className="chip-text">Access controlled, audit-ready</div>
            </div>

            <div className="chip">
              <div className="chip-title">Trusted</div>
              <div className="chip-text">Built for Botswana’s market reality</div>
            </div>

            <div className="chip">
              <div className="chip-title">Practical</div>
              <div className="chip-text">Fast National ID verification</div>
            </div>
          </div>
        </section>

        <section className="card" id="about">
          <h2>Mission</h2>
          <p className="muted">
            To provide institutions with secure, accurate, real-time customer history using National ID-based verification —
            enabling safer decisions, reducing fraud, and restoring accountability in the credit market.
          </p>
        </section>

        <section className="card">
          <h2>Your Values</h2>

          <div className="values">
            <div className="value">
              <div className="value-title">Integrity</div>
              <div className="muted">Your customer data stays protected, and your decisions stay trusted.</div>
            </div>

            <div className="value">
              <div className="value-title">Transparency</div>
              <div className="muted">You see clear customer history — no hidden risk, no guesswork.</div>
            </div>

            <div className="value">
              <div className="value-title">Responsibility</div>
              <div className="muted">You operate with discipline, supporting a healthier credit environment.</div>
            </div>

            <div className="value">
              <div className="value-title">Security</div>
              <div className="muted">Your work is backed by controls designed for real-world risk.</div>
            </div>

            <div className="value">
              <div className="value-title">National Impact</div>
              <div className="muted">You are part of building a stronger, more accountable credit culture in Botswana.</div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Your Responsibility</h2>
          <p className="muted">
            Every search you make is designed to give you clarity — without exposing unnecessary information.
            You stay informed, compliant, and in control of every decision.
          </p>
        </section>

        <footer className="footer">
          <div>© {year} LinkLedger • Botswana</div>

          <div className="footer-links">
 <button
  type="button"
  className="footer-link-btn"
  onClick={logout}
>
  Logout
</button>

  <Link to="/app/dashboard">
    Dashboard
  </Link>
</div>
        </footer>
      </main>
    </main>
  );
}