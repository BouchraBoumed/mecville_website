import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

// Static placeholder posts — replace with content from a CMS or Supabase
// `posts` table when blog management is wired up.
const POSTS = [
  {
    slug: 'welcome-to-mecville',
    title: 'Welcome to Mecville',
    excerpt: 'A new home for premium Pokémon TCG singles, sealed products, and graded cards. Learn what we stand for and what to expect.',
    date: '2025-12-01',
    readingTime: '3 min read',
  },
  {
    slug: 'how-to-store-graded-cards',
    title: 'How to Store Graded Cards Safely',
    excerpt: 'Slabs protect your cards, but they still need care. Our guide to displaying, shelving, and shipping graded Pokémon cards.',
    date: '2025-11-20',
    readingTime: '5 min read',
  },
  {
    slug: 'japanese-vs-english-pokemon-sets',
    title: 'Japanese vs. English Pokémon Sets: What Collectors Should Know',
    excerpt: 'From exclusive promos to print quality, here is the difference between Japanese and English Pokémon TCG releases.',
    date: '2025-11-08',
    readingTime: '6 min read',
  },
];

export default function BlogPage() {
  return (
    <main className="content-area">
      <Seo title="Blog" description="Mecville blog — news, collecting guides, and stories from the Pokémon TCG community." />
      <div className="container">
        <section className="page-intro">
          <h1>Blog</h1>
          <p>News, collecting guides, and stories from the Pokémon TCG community.</p>
        </section>

        <div className="products-grid">
          {POSTS.map(post => (
            <article className="product-card" key={post.slug}>
              <Link to={`/blog/${post.slug}`} className="product-card-link" style={{ padding: 0 }}>
                <div className="product-thumbnail-wrap" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #16243d 0%, #0f1c33 100%)' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Mecville Blog</span>
                </div>
                <div className="product-info">
                  <h3 className="product-title">{post.title}</h3>
                  <div className="product-meta">{new Date(post.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })} · {post.readingTime}</div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.5 }}>{post.excerpt}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}