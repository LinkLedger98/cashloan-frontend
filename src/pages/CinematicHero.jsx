// src/components/CinematicHero.jsx
import { motion } from "framer-motion";
import "../styles/cinematicHero.css";

export default function CinematicHero() {
  return (
    <section className="cinematic-hero">
      <div className="hero-glow hero-glow-one" />
      <div className="hero-glow hero-glow-two" />

      <motion.div
        className="floating-card card-one"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        Consent verified
      </motion.div>

      <motion.div
        className="floating-card card-two"
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        Audit trail active
      </motion.div>

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      >
        <p className="hero-kicker">Botswana-first lending transparency</p>

        <h1>LinkLedger</h1>

        <p className="hero-subtitle">
          Borrower verification, consent tracking, dispute visibility and audit
          accountability for responsible lenders.
        </p>

        <p className="hero-tagline">Clarity. Control. Confidence.</p>

        <div className="hero-actions">
          <a href="/login" className="hero-btn primary">Get Started</a>
          <a href="/compliance" className="hero-btn secondary">View Compliance</a>
        </div>
      </motion.div>
    </section>
  );
}