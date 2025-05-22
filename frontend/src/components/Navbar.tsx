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
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          minHeight: '64px',
        }}
      >
        <div className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/favicon.svg" alt="Tidal Logo" style={{ height: '32px' }} />
          <span className="navbar-title">Tidal 3D Marketplace</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ConnectButton />
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