import React from 'react';
import Hero from '../components/Home/Hero';
import Features from '../components/Home/Features';
import CTA from '../components/Home/CTA';
import AnnouncementBanner from '../components/shared/AnnouncementBanner';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <AnnouncementBanner />
      <Hero />
      <Features />
      <CTA />
    </div>
  );
};

export default HomePage; 