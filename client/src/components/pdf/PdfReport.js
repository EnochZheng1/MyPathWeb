import React from 'react';
import './PdfReport.css';
import logo from '../../assets/hedge-logo.png';

const PdfReport = ({ profile }) => {
  if (!profile) {
    return <div id="pdf-report-content" className="pdf-container">Loading Report...</div>;
  }

  const activities = profile.questionnaire?.filter(q => q.category === 'activities').map(item => item.answer) || [];
  const applicationPlan = [
      ...(profile.applicationStrategies?.earlyDecision || []),
      ...(profile.applicationStrategies?.earlyAction || [])
  ];

  const tracker = profile.tracker || {};
  const gpaUnweighted = tracker.gpa?.unweighted ?? tracker.gpa?.current ?? null;
  const gpaWeighted = tracker.gpa?.weighted ?? null;
  const satScore = tracker.sat?.current ?? null;
  const actScore = tracker.act?.current ?? null;
  const competitionsCount = Array.isArray(tracker.competitions) ? tracker.competitions.length : 0;

  return (
    <div id="pdf-report-content" className="pdf-container">
      <header className="pdf-header">
        <img src={logo} alt="MyPath Logo" className="pdf-logo" />
        <div className="header-text">
          <h1>MyPath AI Summary Report</h1>
          <h2>Prepared for: {profile.name}</h2>
        </div>
      </header>
      
      {/* --- NEW: AI Profile Summary --- */}
      <section className="pdf-section">
        <h3>AI Profile Summary</h3>
        <p className="summary-text">{profile.profileSummary || "No summary generated yet."}</p>
      </section>

      {/* --- NEW: Academic Snapshot --- */}
      <section className="pdf-section">
        <h3>Academic Snapshot</h3>
        <div className="snapshot-grid">
            <div><strong>GPA (Unweighted):</strong> {gpaUnweighted ?? 'N/A'}</div>
            <div><strong>GPA (Weighted):</strong> {gpaWeighted ?? 'N/A'}</div>
            <div><strong>SAT Score:</strong> {satScore ?? 'N/A'}</div>
            <div><strong>ACT Score:</strong> {actScore ?? 'N/A'}</div>
            <div><strong>Competitions:</strong> {competitionsCount}</div>
        </div>
      </section>
      
      <section className="pdf-section">
        <h3>College List & Application Strategy</h3>
        <p><strong>Reaches:</strong> {profile.collegeList.reach.map(c => c.school).join(', ')}</p>
        <p><strong>Targets:</strong> {profile.collegeList.target.map(c => c.school).join(', ')}</p>
        <p><strong>Likelies:</strong> {profile.collegeList.likely.map(c => c.school).join(', ')}</p>
        
        {applicationPlan.length > 0 && (
            <>
                <h4 className="subsection-title">Early Application Plan</h4>
                {applicationPlan.map((plan, i) => (
                    <p key={i}><strong>{plan.plan}:</strong> {plan.school} (Deadline: {plan.deadline})</p>
                ))}
            </>
        )}
      </section>

      <section className="pdf-section">
        <h3>Strengths & Improvements</h3>
        <div className="two-column-layout">
          <div className="column">
            <h4>Strengths</h4>
            <ul>
              {profile.discovered.strengths.map((s, i) => <li key={`s-${i}`}><strong>{s.title}:</strong> {s.details}</li>)}
            </ul>
          </div>
          <div className="column">
            <h4>Improvements</h4>
            <ul>
              {profile.discovered.improvements.map((imp, i) => <li key={`i-${i}`}><strong>{imp.title}:</strong> {imp.details}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="pdf-section">
        <h3>Key Activities</h3>
        {activities.map((act, i) => (
            <div className="activity-item" key={`act-${i}`}>
                <p><strong>{act.name}</strong></p>
                <p>{act.description}</p>
            </div>
        ))}
      </section>

      <footer className="pdf-footer">
        Generated on {new Date().toLocaleDateString()} by MyPath
      </footer>
    </div>
  );
};

export default PdfReport;
