import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-overlay"></div>
      <div className="container hero-content">
        <h1 className="hero-heading">Catch, Trade, Master.</h1>
        <p className="hero-subheading">Premium Pokémon TCG Singles, Sealed Products & Graded Cards</p>
        <Link to="/shop" className="btn btn-accent btn-hero">Shop Now</Link>
      </div>
    </section>
  );
}
