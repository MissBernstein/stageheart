// Main App component for Voices & Profiles feature
import React from 'react';
import { VoicesRouter } from './router';
import './styles/globals.css';

export const VoicesApp: React.FC = () => {
  // Providers are now at the root App level; this component just renders its router
  return <VoicesRouter />;
};