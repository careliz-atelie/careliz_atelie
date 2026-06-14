import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, ArrowLeft } from 'lucide-react';

interface SchedulerProps {
  qualificationData: {
    serviceType: string;
    qtyRange: string;
    urgency: string;
    hasFabric: string;
    priceEstimate: number;
  };
  onBack: () => void;
}

const AVAILABLE_HOURS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

export default function Scheduler({ qualificationData, onBack }: SchedulerProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [busyHours, setBusyHours] = useState<string[]>([]);
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [datesList, setDatesList] = useState<{ value: string; label: string }[]>([]);

  // Gerar os próximos 14 dias úteis (excluindo domingos)
  useEffect(() => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (date.getDay() !== 0) {
        const value = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('pt-BR', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        });
        dates.push({ value, label });
      }
    }
    setDatesList(dates);
  }, []);

  // Buscar horários ocupados/bloqueados do banco sempre que mudar a data
  useEffect(() => {
    if (!selectedDate) return;

    async function loadAvailability() {
      try {
        const { data: appointments, error: appError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('appointment_date', selectedDate)
          .neq('status', 'canceled');

        if (appError) throw appError;

        const { data: blocks, error: blockError } = await supabase
          .from('blocked_slots')
          .select('start_time, end_time')
          .eq('blocked_date', selectedDate);

        if (blockError) throw blockError;

        const dayBlocked = blocks?.some(b => !b.start_time) || false;
        setIsDayBlocked(dayBlocked);

        if (dayBlocked) {
          setBusyHours(AVAILABLE_HOURS);
        } else {
          const busyApps = appointments?.map(a => a.appointment_time.slice(0, 5)) || [];
          const busyBlocks: string[] = [];
          
          blocks?.forEach(b => {
            if (b.start_time && b.end_time) {
              const start = b.start_time.slice(0, 5);
              const end = b.end_time.slice(0, 5);
              AVAILABLE_HOURS.forEach(hour => {
                if (hour >= start && hour < end) {
                  busyBlocks.push(hour);
                }
              });
            }
          });

          const allBusy = Array.from(new Set([...busyApps, ...busyBlocks]));
          setBusyHours(allBusy);
        }
      } catch (err) {
        console.error('Erro ao verificar disponibilidade:', err);
      }
    }

    loadAvailability();
    setSelectedTime('');
  }, [selectedDate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !clientName || !clientPhone) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([
          {
            client_name: clientName,
            client_phone: clientPhone,
            service_type: qualificationData.serviceType,
            estimated_price: qualificationData.priceEstimate,
            appointment_date: selectedDate,
            appointment_time: selectedTime,
            status: 'pending'
          }
        ]);

      if (error) throw error;
      setIsSuccess(true);
    } catch (err) {
      console.error('Erro ao agendar:', err);
      alert('Ocorreu um erro ao registrar seu agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="app-wrapper animate-fade-up" style={{ maxWidth: '500px', marginTop: '60px' }}>
        <div className="card-lux" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ color: 'var(--pink-primary)', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <CheckCircle size={64} />
          </div>
          <h2 style={{ marginBottom: '12px' }}>Agendamento Recebido!</h2>
          <p style={{ marginBottom: '8px' }}>
            Tudo certo, <strong>{clientName}</strong>! Sua visita foi reservada para:
          </p>
          <div style={{ 
            background: 'var(--pink-light)', 
            borderRadius: '12px', 
            padding: '16px 24px', 
            fontSize: '1.25rem', 
            fontWeight: 600,
            color: 'var(--text-main)',
            display: 'inline-block',
            margin: '16px 0',
            border: '1px solid rgba(209, 138, 153, 0.2)'
          }}>
            {selectedDate.split('-').reverse().join('/')} às {selectedTime}
          </div>
          <p style={{ fontSize: '0.9rem', marginBottom: '32px' }}>
            A costureira receberá uma notificação no WhatsApp e confirmará o agendamento em breve.
          </p>
          <button onClick={onBack} className="btn-primary">
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper animate-fade-up">
      <button 
        onClick={onBack} 
        className="btn-secondary"
        style={{ width: 'auto', display: 'inline-flex', marginBottom: '24px', padding: '10px 20px' }}
      >
        <ArrowLeft size={16} />
        Voltar à Qualificação
      </button>

      <div className="card-lux">
        <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarIcon style={{ color: 'var(--gold-primary)' }} />
          Agende sua Visita
        </h2>
        <p style={{ marginBottom: '32px' }}>
          Escolha uma data e horário de sua preferência para trazer as peças ao ateliê.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Escolha do Dia */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px' }}>1. Selecione o Dia</label>
            <div className="dates-scroll">
              {datesList.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDate(d.value)}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedDate === d.value ? 'var(--pink-primary)' : 'var(--border-color)',
                    background: selectedDate === d.value ? 'var(--pink-light)' : 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: selectedDate === d.value ? 600 : 400,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Escolha do Horário */}
          {selectedDate && (
            <div className="animate-fade-in" style={{ marginBottom: '28px' }}>
              <label style={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} />
                2. Selecione o Horário
              </label>
              {isDayBlocked ? (
                <p style={{ color: 'var(--status-canceled-text)', fontSize: '0.9rem', background: 'var(--status-canceled)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(132,32,41,0.1)' }}>
                  A costureira não atenderá nesta data. Por favor, escolha outro dia.
                </p>
              ) : (
                <div className="hours-grid">
                  {AVAILABLE_HOURS.map((hour) => {
                    const isBusy = busyHours.includes(hour);
                    return (
                      <button
                        key={hour}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setSelectedTime(hour)}
                        style={{
                          padding: '14px 0',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: isBusy ? 'transparent' : selectedTime === hour ? 'var(--pink-primary)' : 'var(--border-color)',
                          background: isBusy ? 'rgba(44,31,31,0.05)' : selectedTime === hour ? 'var(--pink-light)' : 'transparent',
                          color: isBusy ? 'var(--text-muted)' : 'var(--text-main)',
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          opacity: isBusy ? 0.35 : 1,
                          fontWeight: selectedTime === hour ? 600 : 400,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {hour}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dados Pessoais */}
          {selectedTime && (
            <div className="animate-fade-up" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '28px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '20px' }}>
                3. Seus Dados de Contato
              </label>
              
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}><User size={18} /></span>
                <input
                  type="text"
                  placeholder="Seu Nome Completo"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input-lux"
                />
              </div>

              <div style={{ marginBottom: '28px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }}><Phone size={18} /></span>
                <input
                  type="tel"
                  placeholder="Seu WhatsApp (com DDD)"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="input-lux"
                />
              </div>

              <div 
                style={{ 
                  background: 'var(--pink-light)', 
                  border: '1px solid rgba(209, 138, 153, 0.2)',
                  borderRadius: '12px', 
                  padding: '16px', 
                  marginBottom: '28px', 
                  fontSize: '0.9rem',
                  color: 'var(--text-main)' 
                }}
              >
                <strong>Serviço selecionado:</strong> {qualificationData.serviceType} <br/>
                <strong>Orçamento Estimado:</strong> R$ {Math.round(qualificationData.priceEstimate * 0.9)} - R$ {Math.round(qualificationData.priceEstimate * 1.25)}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary" 
              >
                {isSubmitting ? 'Agendando...' : 'Confirmar Visita'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
