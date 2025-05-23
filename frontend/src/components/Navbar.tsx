import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@mysten/dapp-kit';

export function Navbar({ user }: { user?: string }) {
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
          <img src="/images/logo-landscape.png" alt="Tidal Logo" style={{ height: '50px', width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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