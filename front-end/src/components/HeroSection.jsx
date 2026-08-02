import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { getFeaturedProducts } from '../api/data';

export default function HeroSection() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const [heroImage, setHeroImage] = useState(null);

  useEffect(() => {
    getFeaturedProducts()
      .then(products => {
        const withImage = products?.find(p => p.images?.[0]?.src);
        if (withImage) setHeroImage(withImage.images[0].src);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const ctx = gsap.context(() => {
      // Entrance timeline
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(eyebrowRef.current, { opacity: 0, y: -12, duration: 0.5 })
        .from(headingRef.current, { opacity: 0, y: 28, duration: 0.8 }, '-=0.2')
        .from(subRef.current, { opacity: 0, y: 20, duration: 0.7 }, '-=0.5')
        .from(ctaRef.current?.children || [], { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 }, '-=0.4');

      // Subtle parallax on the background as the user scrolls past
      gsap.to(section, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="hero-section" style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
      <div className="hero-overlay"></div>
      <div className="container hero-content">
        <p ref={eyebrowRef} className="hero-eyebrow">THE ONLY ONE</p>
        <h1 ref={headingRef} className="hero-heading">Catch Greatness</h1>
        <p ref={subRef} className="hero-subheading">Premium Pokémon cards and collectibles, delivered fast.</p>
        <div ref={ctaRef} className="hero-cta-group">
          <Link to="/shop" className="btn btn-accent btn-hero">Shop Now</Link>
          <Link to="/new-arrivals" className="btn btn-outline btn-hero-ghost">Preorder</Link>
        </div>
      </div>
    </section>
  );
}