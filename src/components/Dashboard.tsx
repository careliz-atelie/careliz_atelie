import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Calendar, Clock, Check, X, ShieldAlert, Trash2, Sliders, Phone } from 'lucide-react';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  service_type: string;
  estimated_price: number | null;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled';
}

interface BlockedSlot {
  id: string;
  blocked_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const { data: apps, error: appsErr } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appsErr) throw appsErr;
      setAppointments(apps || []);

      const { data: blocks, error: blocksErr } = await supabase
        .from('blocked_slots')
        .select('*')
        .order('blocked_date', { ascending: true });

      if (blocksErr) throw blocksErr;
      setBlockedSlots(blocks || []);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Não foi possível atualizar o agendamento.');
    }
  };

  const handleCreateBlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;

    setIsBlocking(true);
    try {
      const { error } = await supabase
        .from('blocked_slots')
        .insert([
          {
            blocked_date: blockDate,
            reason: blockReason || null
          }
        ]);

      if (error) throw error;

      alert('Data bloqueada com sucesso na agenda!');
      setBlockDate('');
      setBlockReason('');
      loadDashboardData();
    } catch (err) {
      console.error('Erro ao bloquear data:', err);
      alert('Não foi possível bloquear a data.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleRemoveBlock = async (id: string) => {
    if (!confirm('Deseja realmente liberar este dia na sua agenda?')) return;

    try {
      const { error } = await supabase
        .from('blocked_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBlockedSlots(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Erro ao deletar bloqueio:', err);
      alert('Não foi possível desbloquear o horário.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="dashboard-wrapper animate-fade-up">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '40px',
        flexWrap: 'wrap',
        gap: '16px' 
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Painel de Gestão</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie seus horários, clientes e entregas.</p>
        </div>
        <button 
          onClick={handleSignOut} 
          className="btn-secondary" 
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Lado Esquerdo: Agenda de Clientes */}
        <div>
          <div className="card-lux" style={{ minHeight: '400px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar style={{ color: 'var(--gold-primary)' }} />
              Seus Agendamentos
            </h2>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Carregando agenda...</p>
            ) : appointments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum agendamento registrado até o momento.</p>
            ) : (
              <div className="appointment-list">
                {appointments.map((app) => (
                  <div key={app.id} className="appointment-card">
                    {/* Header do Card */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{app.client_name}</h3>
                        <a 
                          href={`https://wa.me/${app.client_phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ 
                            fontSize: '0.85rem', 
                            color: 'var(--pink-primary)', 
                            textDecoration: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            marginTop: '2px' 
                          }}
                        >
                          <Phone size={12} />
                          {app.client_phone}
                        </a>
                      </div>
                      
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        padding: '6px 12px', 
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        background: 
                          app.status === 'confirmed' ? 'var(--status-confirmed)' :
                          app.status === 'completed' ? 'var(--status-completed)' :
                          app.status === 'canceled' ? 'var(--status-canceled)' : 'var(--status-pending)',
                        color: 
                          app.status === 'confirmed' ? 'var(--status-confirmed-text)' :
                          app.status === 'completed' ? 'var(--status-completed-text)' :
                          app.status === 'canceled' ? 'var(--status-canceled-text)' : 'var(--status-pending-text)'
                      }}>
                        {app.status === 'pending' ? 'Pendente' :
                         app.status === 'confirmed' ? 'Confirmado' :
                         app.status === 'completed' ? 'Entregue' : 'Cancelado'}
                      </span>
                    </div>

                    {/* Detalhes */}
                    <div className="appointment-card-details" style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {app.appointment_date.split('-').reverse().join('/')} às {app.appointment_time.slice(0,5)}
                      </span>
                      <span>
                        <strong>Serviço:</strong> {app.service_type}
                      </span>
                      {app.estimated_price && (
                        <span>
                          <strong>Média:</strong> R$ {app.estimated_price}
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    {app.status !== 'completed' && app.status !== 'canceled' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {app.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(app.id, 'confirmed')}
                            className="btn-primary" 
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '0.85rem', 
                              display: 'inline-flex', 
                              width: 'auto',
                              background: '#0f5132', 
                              boxShadow: 'none' 
                            }}
                          >
                            <Check size={14} />
                            Confirmar
                          </button>
                        )}
                        
                        {app.status === 'confirmed' && (
                          <button 
                            onClick={() => handleUpdateStatus(app.id, 'completed')}
                            className="btn-primary" 
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '0.85rem', 
                              display: 'inline-flex', 
                              width: 'auto',
                              background: 'var(--pink-primary)', 
                              boxShadow: 'none' 
                            }}
                          >
                            <Check size={14} />
                            Marcar como Entregue
                          </button>
                        )}

                        <button 
                          onClick={() => handleUpdateStatus(app.id, 'canceled')}
                          className="btn-secondary" 
                          style={{ 
                            padding: '8px 16px', 
                            fontSize: '0.85rem', 
                            display: 'inline-flex', 
                            width: 'auto',
                            color: '#842029',
                            background: 'transparent',
                            borderColor: 'rgba(132, 32, 41, 0.2)'
                          }}
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Bloqueio de Agenda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Bloquear Horário */}
          <div className="card-lux">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert style={{ color: 'var(--gold-primary)' }} />
              Bloquear Agenda
            </h2>
            
            <form onSubmit={handleCreateBlock}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Data a bloquear</label>
                <input
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="input-lux"
                  style={{ paddingLeft: '12px' }} // Tira espaço do ícone já que não há ícone nesse input
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Motivo (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Feriado, Consulta"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="input-lux"
                  style={{ paddingLeft: '12px' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isBlocking}
                className="btn-primary" 
                style={{ padding: '10px 0', fontSize: '0.9rem' }}
              >
                {isBlocking ? 'Bloqueando...' : 'Confirmar Bloqueio'}
              </button>
            </form>
          </div>

          {/* Lista de Dias Bloqueados */}
          <div className="card-lux" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={18} />
              Dias Bloqueados
            </h3>
            {blockedSlots.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma data bloqueada.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {blockedSlots.map((b) => (
                  <div 
                    key={b.id} 
                    style={{ 
                      background: 'rgba(255,255,255,0.4)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <strong>{b.blocked_date.split('-').reverse().join('/')}</strong>
                      {b.reason && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.reason}</p>}
                    </div>
                    <button 
                      onClick={() => handleRemoveBlock(b.id)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#842029', 
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
