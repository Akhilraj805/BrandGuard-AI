import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { ContentReview } from './pages/ContentReview';
import { BrandGuidelines } from './pages/BrandGuidelines';
import { ReviewHistory } from './pages/ReviewHistory';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Workflow } from './pages/Workflow';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => { let alive = true; if (localStorage.getItem('bg_token')) api.me().then(u => { if(alive) setUser(u); }).catch(() => localStorage.removeItem('bg_token')).finally(() => { if(alive) setAuthChecked(true); }); else setAuthChecked(true); return () => { alive = false; }; }, []);
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

  if (!authChecked) return <div className="min-h-screen grid place-items-center text-slate-500">Checking secure session…</div>;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-slate-50 font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab !== 'review') setSelectedReviewId(null);
          setCurrentTab(tab);
        }}
        activeGuideline={activeGuideline}
        user={user}
        onLogout={() => { localStorage.removeItem('bg_token'); setUser(null); }}
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
          {currentTab === 'workflow' && <Workflow user={user} />}
        </main>
      </div>
    </div>
  );
}

export default App;
