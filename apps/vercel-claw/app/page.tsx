import { convexTables, defaultClawConfig } from "@vercel-claw/core";

const requiredEnv = defaultClawConfig.requiredEnvVars.map((key) => ({
  key,
  status: process.env[key] ? "ready" : "missing",
}));

const optionalEnv = defaultClawConfig.optionalEnvVars.map((key) => ({
  key,
  status: process.env[key] ? "ready" : "optional",
}));

const isReady = requiredEnv.every((entry) => entry.status === "ready");

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Personal Deployment Surface</p>
        <h1>vercel-claw</h1>
        <p className="lede">
          This app is the deployable UI for a personal open claw-style agent. Vercel serves
          the product surface, Convex owns the agent state, and the CLI handles local setup and
          deployment flow.
        </p>
        <div className="status-row">
          <div className="status-card">
            <span className="label">Stack</span>
            <strong>Next.js + Convex + Bun</strong>
          </div>
          <div className={`status-card ${isReady ? "ready" : "warning"}`}>
            <span className="label">Bootstrap</span>
            <strong>{isReady ? "Ready for runtime" : "Needs env values"}</strong>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="panel-head">
            <span className="kicker">CLI Flow</span>
            <h2>Operator commands</h2>
          </div>
          <ol className="command-list">
            <li>
              <code>vercel-claw init</code>
            </li>
            <li>
              <code>vercel-claw doctor</code>
            </li>
            <li>
              <code>vercel-claw dev</code>
            </li>
            <li>
              <code>vercel-claw deploy --prod</code>
            </li>
          </ol>
        </article>

        <article className="panel">
          <div className="panel-head">
            <span className="kicker">Convex Ownership</span>
            <h2>State lives in Convex</h2>
          </div>
          <ul className="tag-list">
            {convexTables.map((table) => (
              <li key={table}>{table}</li>
            ))}
          </ul>
          <p className="muted">
            The schema is scaffolded in <code>apps/vercel-claw/convex/schema.ts</code> so the
            agent can centralize threads, messages, artifacts, settings, and deployment
            metadata in one backend.
          </p>
        </article>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="panel-head">
            <span className="kicker">Required Env</span>
            <h2>Runtime gates</h2>
          </div>
          <ul className="env-list">
            {requiredEnv.map((entry) => (
              <li key={entry.key}>
                <code>{entry.key}</code>
                <span className={`pill ${entry.status}`}>{entry.status}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-head">
            <span className="kicker">Optional Env</span>
            <h2>Tuning levers</h2>
          </div>
          <ul className="env-list">
            {optionalEnv.map((entry) => (
              <li key={entry.key}>
                <code>{entry.key}</code>
                <span className={`pill ${entry.status}`}>{entry.status}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
