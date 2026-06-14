import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Calendar, Clock, Check, X, ShieldAlert, Trash2, Sliders, Phone, Scissors, Plus, Edit2, Save, Settings } from 'lucide-react';

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

interface DBService {
  id: string;
  garment_type: string;
  service_name: string;
  base_price: number;
}

interface BusinessHours {
  id: number;
  day_name: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  production_start: string;
  production_end: string;
}

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'servicos' | 'horarios'>('agenda');

  // Dados da Agenda
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  // Dados dos Serviços
  const [services, setServices] = useState<DBService[]>([]);
  const [newGarmentType, setNewGarmentType] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);

  // Estados de Edição de Serviço
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editGarmentType, setEditGarmentType] = useState('');
  const [editServiceName, setEditServiceName] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Dados de Funcionamento Semanais (Atendimento vs Produção)
  const [weeklyHours, setWeeklyHours] = useState<BusinessHours[]>([]);
  const [isSavingHours, setIsSavingHours] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Agendamentos
      const { data: apps, error: appsErr } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appsErr) throw appsErr;
      setAppointments(apps || []);

      // 2. Bloqueios pontuais
      const { data: blocks, error: blocksErr } = await supabase
        .from('blocked_slots')
        .select('*')
        .order('blocked_date', { ascending: true });

      if (blocksErr) throw blocksErr;
      setBlockedSlots(blocks || []);

      // 3. Serviços cadastrados
      const { data: servs, error: servsErr } = await supabase
        .from('services')
        .select('*')
        .order('garment_type', { ascending: true })
        .order('service_name', { ascending: true });

      if (servsErr) throw servsErr;
      setServices(servs || []);

      // 4. Horários de funcionamento semanais
      const { data: hours, error: hoursErr } = await supabase
        .from('business_hours')
        .select('*')
        .order('id', { ascending: true });

      if (hoursErr) throw hoursErr;
      setWeeklyHours(hours || []);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  // Alterar o status do agendamento
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

  // Cadastrar um bloqueio na agenda
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

  // Remover um bloqueio
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

  // Cadastrar um novo Serviço/Preço
  const handleCreateService = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGarmentType || !newServiceName || !newBasePrice) return;

    setIsSavingService(true);
    try {
      const { error } = await supabase
        .from('services')
        .insert([
          {
            garment_type: newGarmentType,
            service_name: newServiceName,
            base_price: Number(newBasePrice)
          }
        ]);

      if (error) throw error;

      alert('Serviço cadastrado com sucesso!');
      setNewGarmentType('');
      setNewServiceName('');
      setNewBasePrice('');
      loadDashboardData();
    } catch (err) {
      console.error('Erro ao cadastrar serviço:', err);
      alert('Não foi possível cadastrar o serviço.');
    } finally {
      setIsSavingService(false);
    }
  };

  // Ativar Edição de Serviço
  const startEditService = (service: DBService) => {
    setEditingServiceId(service.id);
    setEditGarmentType(service.garment_type);
    setEditServiceName(service.service_name);
    setEditBasePrice(String(service.base_price));
  };

  // Cancelar Edição
  const cancelEditService = () => {
    setEditingServiceId(null);
  };

  // Atualizar Serviço/Preço Existente
  const handleUpdateService = async (id: string) => {
    if (!editGarmentType || !editServiceName || !editBasePrice) return;
    setIsSavingEdit(true);

    try {
      const { error } = await supabase
        .from('services')
        .update({
          garment_type: editGarmentType,
          service_name: editServiceName,
          base_price: Number(editBasePrice)
        })
        .eq('id', id);

      if (error) throw error;

      setEditingServiceId(null);
      loadDashboardData();
    } catch (err) {
      console.error('Erro ao editar serviço:', err);
      alert('Não foi possível atualizar o serviço.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Remover um Serviço
  const handleRemoveService = async (id: string) => {
    if (!confirm('Deseja realmente excluir este serviço da listagem?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Erro ao deletar serviço:', err);
      alert('Não foi possível excluir o serviço.');
    }
  };

  // Atualizar Horários Semanais da Costureira
  const handleUpdateWeeklyHours = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingHours(true);

    try {
      for (const day of weeklyHours) {
        const { error } = await supabase
          .from('business_hours')
          .update({
            is_open: day.is_open,
            open_time: day.open_time,
            close_time: day.close_time,
            production_start: day.production_start,
            production_end: day.production_end
          })
          .eq('id', day.id);

        if (error) throw error;
      }
      alert('Configurações de atendimento e produção atualizadas com sucesso!');
      loadDashboardData();
    } catch (err) {
      console.error('Erro ao atualizar horários semanais:', err);
      alert('Não foi possível atualizar as configurações de horários.');
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleWeeklyHoursChange = (id: number, field: keyof BusinessHours, value: any) => {
    setWeeklyHours(prev =>
      prev.map(day => (day.id === id ? { ...day, [field]: value } : day))
    );
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
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px' 
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Painel de Gestão</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie seus horários, clientes e serviços.</p>
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

      {/* Abas de Navegação */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('agenda')}
          className={activeTab === 'agenda' ? 'btn-primary' : 'btn-secondary'}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }}
        >
          <Calendar size={16} />
          Ver Agenda
        </button>
        <button 
          onClick={() => setActiveTab('servicos')}
          className={activeTab === 'servicos' ? 'btn-primary' : 'btn-secondary'}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }}
        >
          <Scissors size={16} />
          Gerenciar Serviços & Preços
        </button>
        <button 
          onClick={() => setActiveTab('horarios')}
          className={activeTab === 'horarios' ? 'btn-primary' : 'btn-secondary'}
          style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }}
        >
          <Settings size={16} />
          Configurar Horários
        </button>
      </div>

      {/* ABA 1: AGENDA DE AGENDAMENTOS */}
      {activeTab === 'agenda' && (
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
                    style={{ paddingLeft: '12px' }}
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
      )}

      {/* ABA 2: GERENCIAR SERVIÇOS E PREÇOS */}
      {activeTab === 'servicos' && (
        <div className="dashboard-grid">
          {/* Lado Esquerdo: Lista de Serviços Cadastrados */}
          <div>
            <div className="card-lux" style={{ minHeight: '400px' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Scissors style={{ color: 'var(--gold-primary)' }} />
                Serviços e Preços Cadastrados
              </h2>

              {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Carregando serviços...</p>
              ) : services.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhum serviço cadastrado. Crie um ao lado!</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 8px' }}>Tipo de Roupa</th>
                        <th style={{ padding: '12px 8px' }}>Ajuste/Serviço</th>
                        <th style={{ padding: '12px 8px' }}>Preço Base</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => {
                        const isEditing = editingServiceId === service.id;
                        return (
                          <tr 
                            key={service.id} 
                            style={{ 
                              borderBottom: '1px solid var(--border-color)', 
                              transition: 'background-color 0.2s',
                              backgroundColor: isEditing ? 'rgba(209, 138, 153, 0.05)' : 'transparent'
                            }}
                          >
                            <td style={{ padding: '14px 8px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editGarmentType}
                                  onChange={(e) => setEditGarmentType(e.target.value)}
                                  className="input-lux"
                                  style={{ padding: '8px', paddingLeft: '8px' }}
                                />
                              ) : (
                                <strong style={{ fontWeight: 600 }}>{service.garment_type}</strong>
                              )}
                            </td>

                            <td style={{ padding: '14px 8px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editServiceName}
                                  onChange={(e) => setEditServiceName(e.target.value)}
                                  className="input-lux"
                                  style={{ padding: '8px', paddingLeft: '8px' }}
                                />
                              ) : (
                                service.service_name
                              )}
                            </td>

                            <td style={{ padding: '14px 8px' }}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editBasePrice}
                                  onChange={(e) => setEditBasePrice(e.target.value)}
                                  className="input-lux"
                                  style={{ padding: '8px', paddingLeft: '8px', width: '100px' }}
                                />
                              ) : (
                                <span style={{ color: 'var(--gold-dark)', fontWeight: 600 }}>
                                  R$ {Number(service.base_price).toFixed(2)}
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {isEditing ? (
                                  <>
                                    <button 
                                      onClick={() => handleUpdateService(service.id)}
                                      disabled={isSavingEdit}
                                      style={{ background: 'transparent', border: 'none', color: '#0f5132', cursor: 'pointer', padding: '4px' }}
                                      title="Salvar"
                                    >
                                      <Save size={18} />
                                    </button>
                                    <button 
                                      onClick={cancelEditService}
                                      style={{ background: 'transparent', border: 'none', color: '#842029', cursor: 'pointer', padding: '4px' }}
                                      title="Cancelar"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => startEditService(service)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                      title="Editar"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveService(service.id)}
                                      style={{ background: 'transparent', border: 'none', color: '#842029', cursor: 'pointer', padding: '4px' }}
                                      title="Excluir"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: Adicionar Novo Serviço */}
          <div>
            <div className="card-lux">
              <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus style={{ color: 'var(--gold-primary)' }} />
                Novo Serviço
              </h2>

              <form onSubmit={handleCreateService}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Peça/Tipo de Roupa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Calça Jeans, Vestido"
                    value={newGarmentType}
                    onChange={(e) => setNewGarmentType(e.target.value)}
                    className="input-lux"
                    style={{ paddingLeft: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Nome do Serviço</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Barra Simples, Zíper"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="input-lux"
                    style={{ paddingLeft: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Preço Base (R$)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="Ex: 35.00"
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value)}
                    className="input-lux"
                    style={{ paddingLeft: '12px' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingService}
                  className="btn-primary" 
                  style={{ padding: '10px 0', fontSize: '0.9rem' }}
                >
                  {isSavingService ? 'Salvando...' : 'Cadastrar Serviço'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CONFIGURAR HORÁRIOS DE ATENDIMENTO E PRODUÇÃO */}
      {activeTab === 'horarios' && (
        <div className="animate-fade-in" style={{ width: '100%' }}>
          <div className="card-lux">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings style={{ color: 'var(--gold-primary)' }} />
              Configurações Semanais da Agenda
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Defina os dias e horários de funcionamento do ateliê. Os clientes só poderão marcar visitas no **Horário de Atendimento**, e os períodos de **Produção Interna** (costura) serão bloqueados automaticamente para agendamentos.
            </p>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Carregando horários semanais...</p>
            ) : (
              <form onSubmit={handleUpdateWeeklyHours}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                  {weeklyHours.map((day) => (
                    <div 
                      key={day.id} 
                      style={{ 
                        background: 'rgba(255,255,255,0.4)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'grid',
                        gridTemplateColumns: '150px repeat(2, 1fr) 100px',
                        alignItems: 'center',
                        gap: '20px',
                        flexWrap: 'wrap'
                      }}
                      className="appointment-card-details" // Usa a classe responsiva do CSS global para quebrar em coluna no mobile
                    >
                      {/* Dia e Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={day.is_open}
                          onChange={(e) => handleWeeklyHoursChange(day.id, 'is_open', e.target.checked)}
                          id={`day-${day.id}`}
                          style={{ width: '20px', height: '20px', accentColor: 'var(--pink-primary)', cursor: 'pointer' }}
                        />
                        <label htmlFor={`day-${day.id}`} style={{ fontWeight: 600, cursor: 'pointer' }}>{day.day_name}</label>
                      </div>

                      {/* Horário de Atendimento (Apenas se o dia estiver aberto) */}
                      {day.is_open ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Atendimento (Clientes)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="time"
                                value={day.open_time.slice(0, 5)}
                                onChange={(e) => handleWeeklyHoursChange(day.id, 'open_time', e.target.value + ':00')}
                                className="input-lux"
                                style={{ padding: '8px', paddingLeft: '12px', fontSize: '0.9rem' }}
                              />
                              <span style={{ fontSize: '0.85rem' }}>às</span>
                              <input
                                type="time"
                                value={day.close_time.slice(0, 5)}
                                onChange={(e) => handleWeeklyHoursChange(day.id, 'close_time', e.target.value + ':00')}
                                className="input-lux"
                                style={{ padding: '8px', paddingLeft: '12px', fontSize: '0.9rem' }}
                              />
                            </div>
                          </div>

                          {/* Horário de Produção (Interno) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Produção Interna (Bloqueia Cliente)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="time"
                                value={day.production_start.slice(0, 5)}
                                onChange={(e) => handleWeeklyHoursChange(day.id, 'production_start', e.target.value + ':00')}
                                className="input-lux"
                                style={{ padding: '8px', paddingLeft: '12px', fontSize: '0.9rem' }}
                              />
                              <span style={{ fontSize: '0.85rem' }}>às</span>
                              <input
                                type="time"
                                value={day.production_end.slice(0, 5)}
                                onChange={(e) => handleWeeklyHoursChange(day.id, 'production_end', e.target.value + ':00')}
                                className="input-lux"
                                style={{ padding: '8px', paddingLeft: '12px', fontSize: '0.9rem' }}
                              />
                            </div>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: 'var(--pink-primary)', fontWeight: 600, textAlign: 'center' }}>
                            Aberto
                          </div>
                        </>
                      ) : (
                        <div style={{ gridColumn: 'span 3', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.95rem', padding: '8px 0' }}>
                          Ateliê Fechado neste dia. Sem agendamentos.
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingHours}
                  className="btn-primary" 
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  {isSavingHours ? 'Salvando Configurações...' : 'Salvar Configurações da Agenda'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
