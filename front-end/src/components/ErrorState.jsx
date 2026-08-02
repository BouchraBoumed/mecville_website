import { Link } from 'react-router-dom';

// Reusable error + empty + loading-fallback state.
// Props:
//   title:    heading text
//   message:  explanatory text
//   onRetry:  optional retry handler; shows a Retry button when provided
//   actionTo: optional link href; shows a CTA button when provided
//   actionLabel: label for the CTA button
export default function ErrorState({ title = 'Something went wrong', message, onRetry, actionTo, actionLabel = 'Browse Shop' }) {
  return (
    <div className="state-state">
      <h2 className="state-title">{title}</h2>
      {message && <p className="state-message">{message}</p>}
      <div className="state-actions">
        {onRetry && (
          <button type="button" className="btn btn-accent" onClick={onRetry}>
            Try again
          </button>
        )}
        {actionTo && (
          <Link to={actionTo} className="btn btn-outline">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}