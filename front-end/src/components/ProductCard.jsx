import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const img = product.images?.[0]?.src || '';
  const price = product.prices?.price ? parseInt(product.prices.price) / 100 : product.regular_price;
  const salePrice = product.prices?.sale_price ? parseInt(product.prices.sale_price) / 100 : null;
  const isOnSale = !!salePrice || product.on_sale;
  const displayPrice = salePrice || price;
  const regularPrice = salePrice ? price : null;

  const attrs = [];
  const setAttr = product.attributes?.find(a => a.slug === 'pa_set' || a.name === 'Set');
  const rarityAttr = product.attributes?.find(a => a.slug === 'pa_rarity' || a.name === 'Rarity');
  const condAttr = product.attributes?.find(a => a.slug === 'pa_condition' || a.name === 'Condition');
  if (setAttr) attrs.push(setAttr.options?.[0] || setAttr.option);
  if (rarityAttr) attrs.push(rarityAttr.options?.[0] || rarityAttr.option);
  if (condAttr) attrs.push(condAttr.options?.[0] || condAttr.option);

  return (
    <div className={`product-card ${!product.is_in_stock ? 'product-out-of-stock' : ''}`}>
      <Link to={`/product/${product.slug}`} className="product-card-link">
        <div className="product-thumbnail-wrap">
          {img ? (
            <img src={img} alt={product.name} loading="lazy" />
          ) : (
            <div className="product-thumbnail-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
          )}
          {isOnSale && <span className="sale-badge">Sale</span>}
          {!product.is_in_stock && <span className="stock-badge out-of-stock">Out of Stock</span>}
        </div>
        <div className="product-info">
          <h3 className="product-title">{product.name}</h3>
          {attrs.length > 0 && <div className="product-meta">{attrs.join(' | ')}</div>}
          <div className="product-price">
            {regularPrice && <del>${parseFloat(regularPrice).toFixed(2)}</del>}
            <ins>${parseFloat(displayPrice).toFixed(2)}</ins>
          </div>
        </div>
      </Link>
    </div>
  );
}
