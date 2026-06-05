import logo2 from "../assets/logo2.png";
import "../styles/cinematicHero.css";
import {
  FiShield,
  FiDatabase,
  FiBarChart2
} from "react-icons/fi";

export default function CinematicHero() {
  return (
    <section className="cinematic-intro">

<nav className="hero-nav">

 <div className="hero-brand-block">
  <div className="hero-slogan">
    LINKLEDGER
  </div>

  <div className="hero-slogan">
    WHERE TRUST MEETS TRANSPARENCY
  </div>
</div>

  <div className="hero-nav-actions">
    <a href="/login" className="hero-btn-dark">
      Sign In
    </a>
  </div>

</nav>

      <div className="hero-center">

        <div className="hero-left">

        <h1>
  Trust.
  <br />
  <span className="pink">Transparency.</span>
  <br />
  Together.
</h1>
          <p>
            Building trust through transparency,
            consent, and responsible lending.
          </p>

          <a href="#main-content" className="hero-btn-pink">
            Get Started
          </a>

        </div>

 <div className="hero-logo-stage">

  <div className="orbit orbit-one" />

  <img
    src={logo2}
    alt="LinkLedger Logo"
    className="hero-main-logo"
  />

</div>

<div className="hero-right">

  <div className="hero-feature">
    <FiShield className="feature-icon" />

    <div>
      <h3>Verify with confidence</h3>
      <p>National ID-based verification with consent.</p>
    </div>
  </div>

  <div className="hero-feature">
    <FiDatabase className="feature-icon" />

    <div>
      <h3>Reduce risk</h3>
      <p>Prevent fraud and repeat defaults.</p>
    </div>
  </div>

  <div className="hero-feature">
    <FiBarChart2 className="feature-icon" />

    <div>
      <h3>Make better decisions</h3>
      <p>Accurate data. Clear insights.</p>
    </div>
  </div>

</div>

      </div>

    </section>
  );
}