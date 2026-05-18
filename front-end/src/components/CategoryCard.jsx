import { Link } from 'react-router-dom';

export default function CategoryCard({ category }) {
  const img = category.image?.src || '';
  const slug = category.slug;

  return (
    <Link to={`/shop?category=${slug}`} className="category-card">
      <div className="category-image">
        {img ? (
          <img src={img} alt={category.name} loading="lazy" />
        ) : (
          <div className="category-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          </div>
        )}
      </div>
      <div className="category-info">
        <h3 className="category-name">{category.name}</h3>
        <span className="category-count">{category.count} Products</span>
      </div>
    </Link>
  );
}
