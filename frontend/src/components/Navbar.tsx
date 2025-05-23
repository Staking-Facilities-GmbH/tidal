import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@mysten/dapp-kit';

export function Navbar({ user }: { user?: string }) {
  const location = useLocation();
  const currentPath = location.pathname;
  return (
    <header>
      <nav
        className="navbar"
        style={{
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 2px 16px var(--color-shadow)',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          minHeight: '64px',
        }}
      >
        <div className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/">
            <img src="/images/logo-landscape.png" alt="Tidal Logo" style={{ height: '50px', width: 'auto' }} />
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', marginRight: '1.5rem' }}>
            {currentPath !== '/marketplace' && (
              <Link to="/marketplace">
                <button className="nav-btn" style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 16, cursor: 'pointer', padding: '6px 1px', borderRadius: 8, boxShadow: 'none' }}>Marketplace</button>
              </Link>
            )}
            {currentPath !== '/create' && (
              <Link to="/create">
                <button className="nav-btn" style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 16, cursor: 'pointer', padding: '6px 1px', borderRadius: 8, boxShadow: 'none' }}>Create Asset</button>
              </Link>
            )}
            {currentPath !== '/purchases' && (
              <Link to="/purchases">
                <button className="nav-btn" style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 16, cursor: 'pointer', padding: '6px 1px', borderRadius: 8, boxShadow: 'none' }}>My Purchases</button>
              </Link>
            )}
          </div>
          <ConnectButton style={{
            background: 'linear-gradient(90deg,rgb(13, 110, 221) 0%,rgb(51, 184, 241) 100%)',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 700,
            boxShadow: '0 2px 16px #00eaff80',
            border: 'none',
            padding: '0.75rem 1rem',
            transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
          }} />
          {user && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 500 }}>
              {user}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
} 