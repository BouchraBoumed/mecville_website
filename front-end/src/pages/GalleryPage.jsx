export default function GalleryPage() {
  const galleryItems = [
    { id: 1, title: 'Premium Singles', description: 'Highly sought-after rare cards ready to ship.', image: 'https://images.unsplash.com/photo-1597764693868-4b89be963fe0?auto=format&fit=crop&w=1200&q=80' },
    { id: 2, title: 'Sealed Sets', description: 'New sealed products for collectors and players.', image: 'https://images.unsplash.com/photo-1602021581649-ee882b428ab1?auto=format&fit=crop&w=1200&q=80' },
    { id: 3, title: 'Graded Cards', description: 'Certified graded cards with premium condition.', image: 'https://images.unsplash.com/photo-1533232038690-2ceb7c5743bf?auto=format&fit=crop&w=1200&q=80' },
    { id: 4, title: 'Bundles & Packs', description: 'Value bundles for opening fun and new collections.', image: 'https://images.unsplash.com/photo-1579129367838-d6c77a2de0e1?auto=format&fit=crop&w=1200&q=80' },
  ];

  return (
    <main className="content-area">
      <div className="container">
        <section className="page-intro">
          <h1>Gallery</h1>
          <p>Explore Mecville’s product highlights and premium collectables. Browse curated card collections, sealed sets, and graded inventory in one place.</p>
        </section>

        <div className="gallery-grid">
          {galleryItems.map(item => (
            <article className="gallery-card" key={item.id}>
              <img src={item.image} alt={item.title} />
              <div className="gallery-card-content">
                <h3 className="gallery-card-title">{item.title}</h3>
                <p className="gallery-card-description">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
