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
  const [screen, setScreen] = useState<Screen>('qualify');
  const [session, setSession] = useState<any>(null);
  const [qualificationData, setQualificationData] = useState<QualificationData | null>(null);

  // Verificar se o usuário já está autenticado no carregamento da página
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setScreen('dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setScreen('dashboard');
      } else {
        setScreen('qualify');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleQualified = (data: QualificationData) => {
    setQualificationData(data);
    setScreen('scheduler');
  };

  const handleLogout = () => {
    setScreen('qualify');
  };

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {screen === 'qualify' && (
        <QualifyForm 
          onQualified={handleQualified} 
          onNavigateToLogin={() => setScreen(session ? 'dashboard' : 'login')} 
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
          onBack={() => setScreen('qualify')} 
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard onLogout={handleLogout} />
      )}
    </main>
  );
}
