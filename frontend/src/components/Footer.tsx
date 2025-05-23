import React from 'react';
import { Box } from '@radix-ui/themes';

export function Footer() {
  return (
    <Box as="div" style={{
      width: '100%',
      marginTop: 64,
      padding: '32px 0 16px 0',
      background: 'linear-gradient(90deg, #23263a 0%, #10131a 100%)',
      color: '#8a8fa3',
      textAlign: 'center',
      fontSize: 16,
      borderTop: '1.5px solid rgba(19,125,250,0.08)',
      letterSpacing: 0.2,
    }}>
      <div style={{ marginBottom: 8 }}>
        © {new Date().getFullYear()} Tidal. All rights reserved. <br />
        Made with ❤️ by <a href="https://stakingfacilities.com" target="_blank" rel="noopener noreferrer" style={{
          color: '#00eaff',
          textDecoration: 'none',
          fontWeight: 500,
          margin: '0 8px',
        }}>Staking Facilities</a>
      </div>
      <div>
        <a href="https://github.com/Staking-Facilities-GmbH/tidal/" target="_blank" rel="noopener noreferrer" style={{
          color: '#00eaff',
          textDecoration: 'none',
          fontWeight: 500,
          margin: '0 8px',
        }}>GitHub</a>
        |
        <a href="mailto:info@stakingfacilities.com" style={{
          color: '#00eaff',
          textDecoration: 'none',
          fontWeight: 500,
          margin: '0 8px',
        }}>Contact</a>
      </div>
    </Box>
  );
}