import { useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/landing.css";

export default function Compliance() {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto"
    });
  }, []);

  const items = [
    [
      "1. Data Collection",
      "LinkLedger collects limited customer information submitted by registered institutions, including National ID and repayment status (paid, owing, overdue)."
    ],
    [
      "2. Customer Consent",
      "All customer data must be submitted with verified consent. Institutions are responsible for obtaining and retaining proof of consent before adding any customer record."
    ],
    [
      "3. Data Usage",
      "Customer data is used strictly for verification purposes. LinkLedger enables institutions to assess risk and make informed lending decisions based on shared repayment history."
    ],
    [
      "4. Access Control",
      "Access to customer data is restricted to authorised institutions. Search results are limited to relevant status information and do not expose unnecessary personal data."
    ],
    [
      "5. Audit Logging",
      "All system activity — including logins, searches, and updates — is logged and time-stamped. This ensures accountability and provides a full audit trail of actions within the system."
    ],
    [
      "6. Dispute Resolution",
      "LinkLedger supports a structured dispute process. Customers may raise disputes through participating institutions, and records are reviewed, updated, or corrected where necessary."
    ],
    [
      "7. Data Protection",
      "LinkLedger applies appropriate safeguards to protect customer data and prevent unauthorised access, misuse, or disclosure."
    ],
    [
      "8. Regulatory Position",
      "LinkLedger is a customer verification and repayment status sharing platform aligned with responsible data handling practices."
    ]
  ];

  return (
    <main className="landing-page">
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
            <Link className="btn-ghost btn-sm" to="/">
              Home
            </Link>
            <Link className="btn-primary btn-sm" to="/login">
              Login
            </Link>
          </div>
        </div>

        <section className="section">
          <h3>Compliance & Data Handling</h3>

          <p>
            LinkLedger is designed with a compliance-first approach to support
            responsible lending, protect customer data, and ensure
            accountability across participating institutions.
          </p>
        </section>

        {items.map(([heading, body]) => (
          <section key={heading} className="section">
            <h3>{heading}</h3>
            <p>{body}</p>
          </section>
        ))}

        <section className="section">
          <p>
            For enquiries regarding compliance, data handling, or institutional
            onboarding, please contact LinkLedger directly.
          </p>
        </section>
      </div>
    </main>
  );
}