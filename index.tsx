import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import PlaygroundApp from './PlaygroundApp';
import LandingPage from './components/LandingPage';
import ProductPage from './components/ProductPage';
import ResultsPage from './components/ResultsPage';
import AdminDashboard from './components/AdminDashboard';

type ViewState = 'HOME' | 'PRODUCT' | 'PLAYGROUND' | 'RESULTS' | 'ADMIN'; // Added ADMIN
type Language = 'en' | 'es' | 'ht';

const MainApp: React.FC = () => {
    const [view, setView] = useState<ViewState>('HOME');
    const [language, setLanguage] = useState<Language>('en');
    const [theme, setTheme] = useState<'light'|'dark'>('dark');

    // 1. SYNC THEME WITH DOM IMMEDIATELY
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    // 2. AUTO LOGIN CHECK
    useEffect(() => {
        const autoLogin = localStorage.getItem('beastReaderAutoLogin');
        if (autoLogin === 'true') {
            setView('PLAYGROUND');
        }
    }, []);

    // Lock body scroll when Playground or Admin is open
    useEffect(() => {
        if (view === 'PLAYGROUND' || view === 'ADMIN') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [view]);

    const handleOpenPlayground = () => setView('PLAYGROUND');
    
    const handleClosePlayground = () => {
        // If user explicitly closes the playground, we remove the auto-login preference
        localStorage.removeItem('beastReaderAutoLogin');
        setView('PRODUCT'); 
    };
    
    const handleNavigateToProduct = () => setView('PRODUCT');
    const handleNavigateToResults = () => setView('RESULTS');
    const handleBackToHome = () => setView('HOME');
    const handleAdminAccess = () => setView('ADMIN'); // Callback for PIN success
    
    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <>
            {view === 'HOME' && (
                <LandingPage 
                    onNavigateToProduct={handleNavigateToProduct} 
                    onNavigateToResults={handleNavigateToResults}
                    language={language}
                    setLanguage={setLanguage}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onAdminAccess={handleAdminAccess} // Pass callback
                />
            )}

            {view === 'RESULTS' && (
                <ResultsPage 
                    onBack={handleBackToHome}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
            )}

            {view === 'PRODUCT' && (
                <ProductPage 
                    onOpenPlayground={handleOpenPlayground}
                    onBack={handleBackToHome}
                    language={language}
                    setLanguage={setLanguage}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
            )}

            {view === 'PLAYGROUND' && (
                <div className="fixed inset-0 z-50 bg-light-bg dark:bg-dark-bg overflow-y-auto">
                    <PlaygroundApp onClose={handleClosePlayground} language={language} />
                </div>
            )}

            {view === 'ADMIN' && (
                <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto">
                    <AdminDashboard onClose={handleBackToHome} />
                </div>
            )}
        </>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <MainApp />
    </React.StrictMode>
  );
}