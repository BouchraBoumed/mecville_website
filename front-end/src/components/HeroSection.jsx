import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedProducts } from '../api/data';

export default function HeroSection() {
  const [heroImage, setHeroImage] = useState(null);

  useEffect(() => {
    getFeaturedProducts()
      .then(products => {
        // Pick the first featured product that has an image.
        const withImage = products?.find(p => p.images?.[0]?.src);
        if (withImage) setHeroImage(withImage.images[0].src);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="hero-section" style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
      <div className="hero-overlay"></div>
      <div className="container hero-content">
        <h1 className="hero-heading">Catch, Trade, Master.</h1>
        <p className="hero-subheading">Premium Pokémon TCG Singles, Sealed Products & Graded Cards</p>
        <div className="hero-cta-group">
          <Link to="/shop?category=sealed" className="btn btn-accent btn-hero">Shop Sealed</Link>
          <Link to="/shop?category=singles" className="btn btn-outline btn-hero-ghost">Browse Singles</Link>
        </div>
      </div>
    </section>
  );
}
