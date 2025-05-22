// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Box, Flex, Button } from '@radix-ui/themes';
import { StorePage } from './pages/StorePage';
import { CreateAssetPage } from './pages/CreateAssetPage';
import { UserPurchasesPage } from './pages/UserPurchasesPage';
import { Navbar } from './components/Navbar';

function App() {
  return (
    <Box>
      <Navbar />
      <Flex 
        p="4" 
        justify="between" 
        align="center" 
        style={{ 
          backgroundColor: 'var(--gray-1)',
          borderBottom: '1px solid var(--gray-5)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Flex gap="4">
          <Link to="/">
            <Button variant="ghost" className="nav-btn">Store</Button>
          </Link>
          <Link to="/create">
            <Button variant="ghost" className="nav-btn">Create Asset</Button>
          </Link>
          <Link to="/purchases">
            <Button variant="ghost" className="nav-btn">My Purchases</Button>
          </Link>
        </Flex>
      </Flex>

      <Box p="4">
        <Routes>
          <Route path="/" element={<StorePage />} />
          <Route path="/create" element={<CreateAssetPage />} />
          <Route path="/purchases" element={<UserPurchasesPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
