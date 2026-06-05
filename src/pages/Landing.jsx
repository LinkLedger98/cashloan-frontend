import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import CinematicHero from "./CinematicHero";

import "../styles/landing.css";

export default function Landing() {
  const year = new Date().getFullYear();

  return (
  <>
  <CinematicHero />

  <main id="main-content" className="landing-page">
      <div className="container">
        <div className="topbar">
        <div className="brand">
  <img
    src={logo}
    alt="LinkLedger"
    className="brand-logo"
  />
  <h1>LinkLedger</h1>
</div>

          <div className="nav-actions">
            <a className="pill" href="#products">Solutions</a>
            <a className="pill" href="#how">How it works</a>
            <a className="pill" href="#pricing">Pricing</a>
            <a className="pill" href="#about">About</a>
            <a className="pill" href="#contact">Contact</a>
            <Link className="btn-ghost btn-sm" to="/login">Sign in</Link>
            <Link className="btn-primary btn-sm" to="/signup">Sign up</Link>
          </div>
        </div>

        <div className="hero hero-wrap">
          <div className="signature-watermark">M&lt;M</div>

          <div className="brand-shape" aria-hidden="true">
            <span className="shape-m1"></span>
            <span className="shape-mid"></span>
            <span className="shape-m2"></span>
          </div>

          <div className="hero-card">
            <h2>Verify a customer before you approve.</h2>

            <p className="lead">
              LinkLedger is a Botswana-first customer verification and credit reporting platform for micro-institutions and similar organisations.
              Reduce fraud, prevent repeat defaults, and make accountable lending decisions using National ID-based records.
              <br /><br />
              All customer data is submitted with verified consent, access is logged, and records are maintained with a structured audit trail.
            </p>

            <div className="hero-actions">
              <Link className="btn-primary" to="/signup">Get Started</Link>
              <a className="btn-ghost" href="#pricing">View Pricing</a>
            </div>

            <div className="trust">
              <div className="trust-item">
                <div className="trust-title">Fast</div>
                <div className="trust-text">Search by National ID</div>
              </div>

              <div className="trust-item">
                <div className="trust-title">Safer</div>
                <div className="trust-text">Reduce repeat defaults</div>
              </div>

              <div className="trust-item">
                <div className="trust-title">Compliant</div>
                <div className="trust-text">Consent-based, audit-logged, dispute-ready</div>
              </div>

              <div className="trust-item">
                <div className="trust-title">Local</div>
                <div className="trust-text">Built for Botswana</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Quick Summary</div>

            <div className="list">
              <span>• Institution registration</span>
              <span>• Add customers using National ID</span>
              <span>• Mark: paid / owing / overdue</span>
              <span>• Search customer history across institutions</span>
              <span>• Reduce fraud & improve collections</span>
              <span>• Consent-based data submission with audit logging</span>
              <span>• Structured dispute resolution support</span>
            </div>

            <div className="small">Starting at <b>P500 / month</b> per institution.</div>
          </div>
        </div>

        <div id="products"></div>
        <div className="section">
          <h3>Solutions</h3>
          <p>Organised modules that match how institutions work day-to-day.</p>

          <div className="grid">
            <div className="block">
              <div className="block-title">Customer Verification</div>
              <div className="list">
                <span>• Search by National ID</span>
                <span>• See reported credit status history</span>
                <span>• Identify high-risk repeat activity</span>
              </div>

              <div className="hero-actions" style={{ marginTop: 12 }}>
                <a className="btn-primary" href="#contact">Enquire Now</a>
              </div>
            </div>

            <div className="block">
              <div className="block-title">Customer Management</div>
              <div className="list">
                <span>• Add customer details</span>
                <span>• Mark: paid / owing / overdue</span>
                <span>• Maintain a structured, time-stamped audit trail</span>
              </div>

              <div className="hero-actions" style={{ marginTop: 12 }}>
                <Link className="btn-primary" to="/signup">Create Account</Link>
              </div>
            </div>
          </div>
        </div>

        <div id="how"></div>
        <div className="section">
          <h3>How it works</h3>
          <p>Simple process. Clear accountability.</p>

          <div className="grid">
            <div className="block">
              <div className="block-title">1) Register</div>
              <div className="list">
                <span>Institution registration for your organisation.</span>
              </div>
            </div>

            <div className="block">
              <div className="block-title">2) Add customers</div>
              <div className="list">
                <span>Record National ID and credit status with verified customer consent.</span>
              </div>
            </div>

            <div className="block">
              <div className="block-title">3) Verify before approving</div>
              <div className="list">
                <span>Search customer history across institutions with controlled, logged access.</span>
              </div>
            </div>

            <div className="block">
              <div className="block-title">4) Make safer decisions</div>
              <div className="list">
                <span>Reduce fraud and improve collections.</span>
              </div>
            </div>
          </div>
        </div>

        <div id="pricing"></div>
        <div className="section">
          <h3>Pricing</h3>
          <p>Simple, institution-friendly pricing. Start small and scale as you grow.</p>

          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-top">
                <div className="price-name">Starter</div>
                <div className="price-tag">Best for early institutions</div>
              </div>

              <div className="price">
                <span className="currency">P</span>500<span className="per">/ month</span>
              </div>

              <div className="price-list">
                <span>• Institution registration</span>
                <span>• Add customers + credit statuses</span>
                <span>• Search customer history</span>
                <span>• Basic audit trail</span>
              </div>

              <div className="price-actions">
                <Link className="btn-primary" to="/signup">Start Starter</Link>
              </div>
            </div>

            <div className="price-card featured">
              <div className="featured-badge">Most Popular</div>

              <div className="price-top">
                <div className="price-name">Growth</div>
                <div className="price-tag">Best for busy institutions</div>
              </div>

              <div className="price">
                <span className="currency">P</span>850<span className="per">/ month</span>
              </div>

              <div className="price-list">
                <span>• Everything in Starter</span>
                <span>• Higher search usage</span>
                <span>• Priority onboarding</span>
                <span>• Enhanced reporting (coming soon)</span>
              </div>

              <div className="price-actions">
                <a
                  className="btn-primary"
                  href="mailto:admin@linkledger.co.bw?subject=Growth Plan Enquiry&body=Hello LinkLedger,%0D%0A%0D%0AWe are interested in the Growth plan.%0D%0A%0D%0ABusiness Name:%0D%0ABranch:%0D%0AEstimated Monthly Volume:%0D%0AContact Person:%0D%0APhone Number:%0D%0A%0D%0APlease share pricing and onboarding details.%0D%0A%0D%0AThank you."
                >
                  Enquire
                </a>
              </div>
            </div>

            <div className="price-card">
              <div className="price-top">
                <div className="price-name">Enterprise</div>
                <div className="price-tag">For institutions / groups</div>
              </div>

              <div className="price">Custom</div>

              <div className="price-list">
                <span>• Multi-branch support</span>
                <span>• Custom compliance / reporting</span>
                <span>• Dedicated support</span>
                <span>• Integration options (future)</span>
              </div>

              <div className="price-actions">
                <a
                  className="btn-primary"
                  href="mailto:admin@linkledger.co.bw?subject=Enterprise Plan Enquiry&body=Hello LinkLedger,%0D%0A%0D%0AWe are interested in the Enterprise plan.%0D%0A%0D%0ABusiness Name:%0D%0ANumber of Branches:%0D%0AExpected Usage:%0D%0ACustom Requirements:%0D%0AContact Person:%0D%0APhone Number:%0D%0A%0D%0APlease provide a custom quote and onboarding process.%0D%0A%0D%0AThank you."
                >
                  Request Quote
                </a>
              </div>
            </div>
          </div>

          <div className="pricing-note">
            Payments: bank transfer / deposit (for now). Card payments can be added later.
          </div>
        </div>

        <div id="about"></div>
        <div className="section">
          <h3>About LinkLedger</h3>
          <p>
            LinkLedger is a Botswana-first customer verification and credit reporting platform built to help institutions verify customer history,
            reduce fraud, and improve repayment discipline across the lending market.
            <br /><br />
            The platform is designed with a compliance-first approach, ensuring consent-based data sharing, audit logging, and structured dispute resolution.
          </p>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          LinkLedger operates under a compliance-first approach aligned with data protection and financial regulatory frameworks. All customer data requires documented consent.
        </div>

        <div id="contact"></div>
        <div className="section">
          <h3>Contact</h3>
          <p>Want to onboard your institution or ask questions? Reach out.</p>

          <div className="grid">
            <div className="block">
              <div className="block-title">Email</div>
              <div className="list">
                <span>
                  <a href="mailto:linkledger98@gmail.com">linkledger98@gmail.com</a>
                </span>
              </div>
            </div>

            <div className="block">
              <div className="block-title">Phone</div>
              <div className="list">
                <span>
                  <a href="tel:+26773132277">+267 73132277</a>
                </span>
              </div>
            </div>
          </div>

          <div className="hero-actions" style={{ marginTop: 12 }}>
            <Link className="btn-primary" to="/signup">Create Account</Link>
            <Link className="btn-ghost" to="/login">Sign in</Link>
          </div>
        </div>

        <div className="footer">
          <div>© {year} LinkLedger • Botswana</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#products">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <Link to="/compliance">Compliance</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
           </div>
    </main>
    </>
  );
}