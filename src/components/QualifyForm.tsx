import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, MessageCircle, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

interface QualifyFormProps {
  onQualified: (data: {
    serviceType: string;
    qtyRange: string;
    urgency: string;
    hasFabric: string;
    priceEstimate: number;
  }) => void;
  onNavigateToLogin: () => void;
}

interface DBService {
  id: string;
  garment_type: string;
  service_name: string;
  base_price: number;
}

export default function QualifyForm({ onQualified, onNavigateToLogin }: QualifyFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Lista de peças e serviços vindos do Supabase
  const [dbGarments, setDbGarments] = useState<string[]>([]);
  const [dbServices, setDbServices] = useState<DBService[]>([]);

  // Seleções do usuário
  const [serviceType, setServiceType] = useState(''); // Peça (garment_type)
  const [selectedServiceId, setSelectedServiceId] = useState(''); // ID do Serviço específico
  const [qtyRange, setQtyRange] = useState('');
  const [urgency, setUrgency] = useState('');
  const [hasFabric, setHasFabric] = useState('');

  // 1. Carrega as peças únicas (garment_type) do Supabase no início
  useEffect(() => {
    async function loadGarments() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('garment_type');

        if (error) throw error;

        // Extrair tipos únicos
        const uniqueGarments = Array.from(new Set(data?.map(item => item.garment_type) || []));
        setDbGarments(uniqueGarments);
      } catch (err) {
        console.error('Erro ao carregar tipos de roupas:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGarments();
  }, []);

  // 2. Carrega os serviços específicos quando a peça (garment_type) é selecionada
  useEffect(() => {
    if (!serviceType) {
      setDbServices([]);
      setSelectedServiceId('');
      return;
    }

    async function loadServices() {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('garment_type', serviceType);

        if (error) throw error;
        setDbServices(data || []);
        setSelectedServiceId(''); // Reseta seleção do serviço
      } catch (err) {
        console.error('Erro ao carregar serviços da peça:', err);
      }
    }
    loadServices();
  }, [serviceType]);

  // Encontra o serviço selecionado atualmente
  const currentService = dbServices.find(s => s.id === selectedServiceId);

  // Lógica de cálculo de orçamento estimado com base no preço real do banco
  const calculateBudget = () => {
    if (!currentService) return 0;
    
    const basePrice = Number(currentService.base_price);
    let qtyMultiplier = 1;
    if (qtyRange === '2 a 3 peças') qtyMultiplier = 2;
    if (qtyRange === 'Mais de 3 peças') qtyMultiplier = 3.5;

    let urgencyMultiplier = 1.0;
    if (urgency === 'Urgente (até 3 dias)') urgencyMultiplier = 1.3;

    const total = basePrice * qtyMultiplier * urgencyMultiplier;
    return Math.round(total);
  };

  const priceEstimate = calculateBudget();
  const priceMin = Math.round(priceEstimate * 0.9 / 5) * 5;
  const priceMax = Math.round(priceEstimate * 1.25 / 5) * 5;

  // Se for serviço premium (ex: Vestido de Festa) sugere visita presencial
  const isQualifiedForVisit = 
    serviceType.toLowerCase().includes('festa') || 
    serviceType.toLowerCase().includes('noiva') ||
    serviceType.toLowerCase().includes('medida');

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleWhatsAppRedirect = () => {
    const phoneNumber = '5511999999999'; // Substituir pelo número real
    const message = `Olá! Realizei a simulação no site. 
- *Peça*: ${serviceType}
- *Serviço*: ${currentService?.service_name || 'Personalizado'}
- *Quantidade*: ${qtyRange}
- *Urgência*: ${urgency}
- *Tecido*: ${hasFabric}
- *Orçamento Estimado*: R$ ${priceMin} - R$ ${priceMax}
Gostaria de tirar algumas dúvidas!`;
    
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleProceedToSchedule = () => {
    onQualified({
      serviceType: `${serviceType} - ${currentService?.service_name || ''}`,
      qtyRange,
      urgency,
      hasFabric,
      priceEstimate
    });
  };

  return (
    <div className="app-wrapper animate-fade-up">
      {/* Header do Site */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="/logo.jpg" 
            alt="Careliz Ateliê Logo" 
            style={{ 
              height: '60px', 
              width: '60px', 
              borderRadius: '12px', 
              objectFit: 'cover',
              border: '2px solid var(--gold-primary)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
            }} 
          />
          <h1 style={{ fontSize: '2.4rem', margin: 0 }}>Careliz Ateliê</h1>
        </div>
        <button 
          onClick={onNavigateToLogin}
          className="btn-secondary"
          style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }}
        >
          Área Restrita
        </button>
      </div>

      {/* Card Principal */}
      <div className="card-lux">
        {/* Barra de Progresso */}
        <div style={{ 
          height: '4px', 
          background: 'var(--pink-light)', 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0 
        }}>
          <div style={{ 
            height: '100%', 
            background: 'var(--pink-primary)', 
            width: `${(step / 5) * 100}%`,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
          }} />
        </div>

        <div style={{ marginTop: '16px' }} className="animate-fade-in">
          {/* ETAPA 1: SELECIONAR A ROUPA */}
          {step === 1 && (
            <div>
              <h2 style={{ marginBottom: '8px' }}>Que tipo de roupa deseja trazer?</h2>
              <p style={{ marginBottom: '28px' }}>Selecione uma das opções cadastradas abaixo.</p>
              
              {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Carregando opções do ateliê...</p>
              ) : dbGarments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Nenhum serviço cadastrado ainda no Supabase.</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--pink-primary)' }}>Cadastre peças e preços no Painel Administrativo!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dbGarments.map((garment) => (
                    <label 
                      key={garment} 
                      className={`option-select ${serviceType === garment ? 'active' : ''}`}
                    >
                      <input 
                        type="radio" 
                        name="serviceType" 
                        value={garment} 
                        checked={serviceType === garment}
                        onChange={() => setServiceType(garment)}
                      />
                      {garment}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2: SELECIONAR O SERVIÇO */}
          {step === 2 && (
            <div>
              <h2 style={{ marginBottom: '8px' }}>Qual ajuste/serviço necessário para esta peça?</h2>
              <p style={{ marginBottom: '28px' }}>Escolha o serviço correspondente para calcularmos o orçamento.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dbServices.map((service) => (
                  <label 
                    key={service.id} 
                    className={`option-select ${selectedServiceId === service.id ? 'active' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name="selectedServiceId" 
                      value={service.id} 
                      checked={selectedServiceId === service.id}
                      onChange={() => setSelectedServiceId(service.id)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{service.service_name}</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Preço base: R$ {service.base_price}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 3: QUANTIDADE */}
          {step === 3 && (
            <div>
              <h2 style={{ marginBottom: '8px' }}>Quantas peças você deseja trazer?</h2>
              <p style={{ marginBottom: '28px' }}>Isso nos ajuda a estimar o tempo necessário de atendimento.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['1 peça', '2 a 3 peças', 'Mais de 3 peças'].map((qty) => (
                  <label 
                    key={qty} 
                    className={`option-select ${qtyRange === qty ? 'active' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name="qtyRange" 
                      value={qty} 
                      checked={qtyRange === qty}
                      onChange={() => setQtyRange(qty)}
                    />
                    {qty}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 4: URGÊNCIA */}
          {step === 4 && (
            <div>
              <h2 style={{ marginBottom: '8px' }}>Qual o prazo ideal para você?</h2>
              <p style={{ marginBottom: '28px' }}>Para prazos curtos, pode ser aplicada uma taxa de urgência.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Normal (7 a 10 dias)', 'Sem pressa (até 15 dias)', 'Urgente (até 3 dias)'].map((urg) => (
                  <label 
                    key={urg} 
                    className={`option-select ${urgency === urg ? 'active' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name="urgency" 
                      value={urg} 
                      checked={urgency === urg}
                      onChange={() => setUrgency(urg)}
                    />
                    {urg}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 5: ORÇAMENTO E REDIRECIONAMENTO */}
          {step === 5 && (
            <div>
              <h2 style={{ marginBottom: '8px' }}>Você já possui o tecido ou material?</h2>
              <p style={{ marginBottom: '28px' }}>Último detalhe para definirmos seu orçamento médio.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {['Sim, já tenho tudo', 'Não, preciso de orientação', 'Não se aplica (somente ajustes/reformas)'].map((fab) => (
                  <label 
                    key={fab} 
                    className={`option-select ${hasFabric === fab ? 'active' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name="hasFabric" 
                      value={fab} 
                      checked={hasFabric === fab}
                      onChange={() => setHasFabric(fab)}
                    />
                    {fab}
                  </label>
                ))}
              </div>

              {hasFabric && currentService && (
                <div 
                  className="animate-fade-up"
                  style={{ 
                    background: 'rgba(197, 168, 128, 0.08)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '16px',
                    padding: '28px 20px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px', color: 'var(--gold-dark)' }}>
                    <Sparkles size={20} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Orçamento Estimado</span>
                  </div>
                  
                  <h3 style={{ fontSize: '2.4rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                    R$ {priceMin} - R$ {priceMax}
                  </h3>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    *O valor final será calculado e confirmado presencialmente.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isQualifiedForVisit ? (
                      <>
                        <button 
                          onClick={handleProceedToSchedule}
                          className="btn-primary"
                        >
                          <Calendar size={18} />
                          Agendar Visita Presencial
                        </button>
                        <button 
                          onClick={handleWhatsAppRedirect}
                          className="btn-secondary"
                        >
                          <MessageCircle size={18} />
                          Tirar dúvidas no WhatsApp
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={handleWhatsAppRedirect}
                          className="btn-primary"
                        >
                          <MessageCircle size={18} />
                          Conversar no WhatsApp
                        </button>
                        <button 
                          onClick={handleProceedToSchedule}
                          className="btn-secondary"
                        >
                          <Calendar size={18} />
                          Agendar Visita ao Ateliê
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé de Navegação */}
        {step < 5 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '36px', 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '24px',
            gap: '16px'
          }}>
            <button 
              onClick={handleBack} 
              disabled={step === 1}
              className="btn-secondary"
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', opacity: step === 1 ? 0.4 : 1 }}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            <button 
              onClick={handleNext}
              disabled={
                (step === 1 && !serviceType) ||
                (step === 2 && !selectedServiceId) ||
                (step === 3 && !qtyRange) ||
                (step === 4 && !urgency)
              }
              className="btn-primary"
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Avançar
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
