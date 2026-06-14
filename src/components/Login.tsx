import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

export default function Login({ onLoginSuccess, onBack }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      console.error('Erro de autenticação:', err.message);
      alert('E-mail ou senha incorretos. Verifique suas credenciais no Supabase!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-wrapper animate-fade-up" style={{ maxWidth: '440px' }}>
      <button 
        onClick={onBack} 
        className="btn-secondary"
        style={{ width: 'auto', display: 'inline-flex', marginBottom: '24px', padding: '10px 20px' }}
      >
        <ArrowLeft size={16} />
        Voltar ao Início
      </button>

      <div className="card-lux">
        <h2 style={{ fontSize: '2.2rem', marginBottom: '8px', textAlign: 'center' }}>Área Restrita</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', fontSize: '0.95rem' }}>
          Identifique-se para gerenciar a agenda do ateliê.
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}><Mail size={18} /></span>
            <input
              type="email"
              placeholder="E-mail profissional"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-lux"
            />
          </div>

          <div style={{ marginBottom: '28px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}><Lock size={18} /></span>
            <input
              type="password"
              placeholder="Senha de acesso"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-lux"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary" 
          >
            {isLoading ? 'Autenticando...' : 'Acessar Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
