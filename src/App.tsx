import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import QualifyForm from './components/QualifyForm';
import Scheduler from './components/Scheduler';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

type Screen = 'qualify' | 'scheduler' | 'login' | 'dashboard';

interface QualificationData {
  serviceType: string;
  qtyRange: string;
  urgency: string;
  hasFabric: string;
  priceEstimate: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    return window.location.pathname === '/admin' ? 'login' : 'qualify';
  });
  const [session, setSession] = useState<any>(null);
  const [qualificationData, setQualificationData] = useState<QualificationData | null>(null);

  // Verificar se o usuário já está autenticado no carregamento da página
  useEffect(() => {
    const isLinkAdmin = window.location.pathname === '/admin';

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setScreen('dashboard');
      } else if (isLinkAdmin) {
        setScreen('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setScreen('dashboard');
      } else {
        setScreen(window.location.pathname === '/admin' ? 'login' : 'qualify');
      }
    });

    const handlePopState = async () => {
      const isLinkAdmin = window.location.pathname === '/admin';
      if (isLinkAdmin) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setScreen(currentSession ? 'dashboard' : 'login');
      } else {
        setScreen('qualify');
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleQualified = (data: QualificationData) => {
    setQualificationData(data);
    setScreen('scheduler');
  };

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {screen === 'qualify' && (
        <QualifyForm 
          onQualified={handleQualified} 
          onNavigateToLogin={() => {
            window.history.pushState({}, '', '/admin');
            setScreen(session ? 'dashboard' : 'login');
          }} 
        />
      )}

      {screen === 'scheduler' && qualificationData && (
        <Scheduler 
          qualificationData={qualificationData} 
          onBack={() => setScreen('qualify')} 
        />
      )}

      {screen === 'login' && (
        <Login 
          onLoginSuccess={() => setScreen('dashboard')} 
          onBack={() => {
            window.history.pushState({}, '', '/');
            setScreen('qualify');
          }} 
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard onLogout={() => {
          window.history.pushState({}, '', '/');
          setScreen('qualify');
        }} />
      )}
    </main>
  );
}
