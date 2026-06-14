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

interface BusinessHours {
  id: number;
  day_name: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  production_start: string;
  production_end: string;
}

export default function Scheduler({ qualificationData, onBack }: SchedulerProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  // Disponibilidade
  const [weeklyHours, setWeeklyHours] = useState<BusinessHours[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [busyHours, setBusyHours] = useState<string[]>([]);
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [dayClosedMessage, setDayClosedMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [datesList, setDatesList] = useState<{ value: string; label: string }[]>([]);

  // 1. Gerar os próximos 14 dias (excluindo domingos)
  useEffect(() => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (date.getDay() !== 0) { // Excluir domingo da lista inicial
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

    // Carregar configurações semanais de horários do Supabase
    async function loadWeeklyHours() {
      try {
        const { data, error } = await supabase
          .from('business_hours')
          .select('*');
        if (error) throw error;
        setWeeklyHours(data || []);
      } catch (err) {
        console.error('Erro ao carregar horários semanais:', err);
      }
    }
    loadWeeklyHours();
  }, []);

  // Auxiliares de tempo para manipulação de minutos
  const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 2. Buscar disponibilidade e gerar slots de 30min ao mudar a data
  useEffect(() => {
    if (!selectedDate || weeklyHours.length === 0) return;

    async function calculateDailySlots() {
      try {
        // Encontra o dia da semana correspondente (1 = Segunda, ..., 6 = Sábado, 0 = Domingo)
        // Usar sufixo T00:00:00 para manter o fuso horário correto
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        if (dayOfWeek === 0) {
          setIsDayBlocked(true);
          setDayClosedMessage('O ateliê não abre aos Domingos.');
          setAvailableSlots([]);
          return;
        }

        const todaySetting = weeklyHours.find(h => h.id === dayOfWeek);

        if (!todaySetting || !todaySetting.is_open) {
          setIsDayBlocked(true);
          setDayClosedMessage('A costureira não atende neste dia da semana.');
          setAvailableSlots([]);
          return;
        }

        setIsDayBlocked(false);
        setDayClosedMessage('');

        // Gerar os slots de 30 em 30 minutos
        const openMin = parseTimeToMinutes(todaySetting.open_time);
        const closeMin = parseTimeToMinutes(todaySetting.close_time);
        const prodStartMin = parseTimeToMinutes(todaySetting.production_start);
        const prodEndMin = parseTimeToMinutes(todaySetting.production_end);

        const slots: string[] = [];
        for (let min = openMin; min < closeMin; min += 30) {
          // Excluir horários que sobrepõem com o período de produção interna da costureira
          if (min >= prodStartMin && min < prodEndMin) {
            continue;
          }
          slots.push(minutesToTime(min));
        }
        setAvailableSlots(slots);

        // 3. Buscar agendamentos existentes para desabilitar os ocupados
        const { data: appointments, error: appError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('appointment_date', selectedDate)
          .neq('status', 'canceled');

        if (appError) throw appError;

        // 4. Buscar folgas/bloqueios pontuais do banco
        const { data: blocks, error: blockError } = await supabase
          .from('blocked_slots')
          .select('start_time, end_time')
          .eq('blocked_date', selectedDate);

        if (blockError) throw blockError;

        const dayBlockedPoint = blocks?.some(b => !b.start_time) || false;
        if (dayBlockedPoint) {
          setIsDayBlocked(true);
          setDayClosedMessage('A costureira bloqueou este dia na agenda para fins pessoais.');
          setAvailableSlots([]);
          return;
        }

        const busyApps = appointments?.map(a => a.appointment_time.slice(0, 5)) || [];
        const busyBlocks: string[] = [];
        
        blocks?.forEach(b => {
          if (b.start_time && b.end_time) {
            const start = parseTimeToMinutes(b.start_time);
            const end = parseTimeToMinutes(b.end_time);
            slots.forEach(slot => {
              const slotMin = parseTimeToMinutes(slot);
              if (slotMin >= start && slotMin < end) {
                busyBlocks.push(slot);
              }
            });
          }
        });

        setBusyHours(Array.from(new Set([...busyApps, ...busyBlocks])));
      } catch (err) {
        console.error('Erro ao verificar disponibilidade diária:', err);
      }
    }

    calculateDailySlots();
    setSelectedTime('');
  }, [selectedDate, weeklyHours]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !clientName || !clientPhone) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    const finalPrice = Math.round(qualificationData.priceEstimate * 0.9);

    try {
      // 1. Salva no Supabase
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

      // 2. Dispara a notificação via Netlify Serverless Function de forma assíncrona
      fetch('/.netlify/functions/whatsapp-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName,
          client_phone: clientPhone,
          service_type: qualificationData.serviceType,
          estimated_price: `R$ ${finalPrice} - R$ ${Math.round(qualificationData.priceEstimate * 1.25)}`,
          appointment_date: selectedDate,
          appointment_time: selectedTime
        })
      }).catch(err => console.error('Erro ao disparar notificação de WhatsApp:', err));

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
                2. Selecione o Horário (Slots de 30min)
              </label>
              {isDayBlocked ? (
                <p style={{ color: 'var(--status-canceled-text)', fontSize: '0.9rem', background: 'var(--status-canceled)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(132,32,41,0.1)' }}>
                  {dayClosedMessage || 'A costureira não atenderá nesta data.'}
                </p>
              ) : availableSlots.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando horários...</p>
              ) : (
                <div className="hours-grid">
                  {availableSlots.map((hour) => {
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
