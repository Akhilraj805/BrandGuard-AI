import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { ContentReview } from './pages/ContentReview';
import { BrandGuidelines } from './pages/BrandGuidelines';
import { ReviewHistory } from './pages/ReviewHistory';
import { Settings } from './pages/Settings';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeGuideline, setActiveGuideline] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Poll service health
  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setIsConnected(data.status === 'healthy');
    } catch {
      setIsConnected(false);
    }
  };

  // Fetch active guideline
  const refreshGuidelines = async () => {
    try {
      const list = await api.getGuidelines();
      const active = list.find((g) => g.is_active) || list[0];
      setActiveGuideline(active || null);
    } catch (err) {
      console.error('Failed to refresh guidelines:', err);
    }
  };

  useEffect(() => {
    checkHealth();
    refreshGuidelines();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenReview = (reviewId) => {
    setSelectedReviewId(reviewId);
    setCurrentTab('review');
  };

  const handleNewReview = () => {
    setSelectedReviewId(null);
    setCurrentTab('review');
  };

  return (
    <div className="flex min-h-screen h-[100dvh] bg-slate-50 overflow-hidden font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab !== 'review') setSelectedReviewId(null);
          setCurrentTab(tab);
        }}
        activeGuideline={activeGuideline}
        isConnected={isConnected}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Compact Top Navigation Bar */}
        <Header
          currentTab={currentTab}
          onNewReview={handleNewReview}
          activeGuideline={activeGuideline}
          isConnected={isConnected}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigateToReview={handleNewReview}
              onOpenReview={handleOpenReview}
              onNavigateToGuidelines={() => setCurrentTab('guidelines')}
            />
          )}

          {currentTab === 'review' && (
            <ContentReview
              initialReviewId={selectedReviewId}
              onClearReviewSelection={() => setSelectedReviewId(null)}
            />
          )}

          {currentTab === 'guidelines' && (
            <BrandGuidelines
              onGuidelineChanged={refreshGuidelines}
            />
          )}

          {currentTab === 'history' && (
            <ReviewHistory
              onOpenReview={handleOpenReview}
              onNewReview={handleNewReview}
            />
          )}

          {currentTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default App;
