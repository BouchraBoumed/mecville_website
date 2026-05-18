import { Link } from 'react-router-dom';

export default function AccountPage() {
  return (
    <main className="content-area">
      <div className="container">
        <nav className="woocommerce-breadcrumb">
          <Link to="/">Home</Link> / <span>My Account</span>
        </nav>
        <div className="my-account-wrapper">
          <nav className="woocommerce-MyAccount-navigation">
            <ul>
              <li className="is-active"><a>Dashboard</a></li>
              <li><a>Orders</a></li>
              <li><a>Addresses</a></li>
              <li><a>Account Details</a></li>
            </ul>
          </nav>
          <div className="woocommerce-MyAccount-content">
            <p>Account features require a JWT Authentication plugin on WordPress backend. Guest checkout is available for now.</p>
            <p><Link to="/shop" className="btn btn-accent">Browse Products</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}
