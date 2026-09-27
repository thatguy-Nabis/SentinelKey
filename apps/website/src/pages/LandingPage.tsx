import React from 'react';
import { Navbar } from '../components/landing/Navbar.js';
import { Hero } from '../components/landing/Hero.js';
import { Features } from '../components/landing/Features.js';
import { Pricing } from '../components/landing/Pricing.js';
import { Footer } from '../components/landing/Footer.js';

export const LandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};
