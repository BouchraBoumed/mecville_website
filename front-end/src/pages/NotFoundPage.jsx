import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="content-area error-404">
      <div className="container">
        <div className="error-404-content">
          <span className="error-code">404</span>
          <h1>Page Not Found</h1>
          <p>The card you're looking for might have been traded away.</p>
          <Link to="/" className="btn btn-accent">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
