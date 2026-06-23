import { Helmet } from 'react-helmet-async';

const site = {
  name: 'Mecville',
  title: 'Mecville - Pokémon TCG Store',
  description: 'Premium Pokémon TCG singles, sealed products, graded cards, and bundles. Serving collectors across Canada with free shipping over $100 CAD.',
  url: 'https://mecville.com',
  image: '/logo.webp',
};

export default function Seo({ title, description, image, url }) {
  const pageTitle = title ? `${title} | ${site.name}` : site.title;
  const pageDescription = description || site.description;
  const pageImage = image || site.image;
  const pageUrl = url ? `${site.url}${url}` : site.url;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <link rel="canonical" href={pageUrl} />
    </Helmet>
  );
}
