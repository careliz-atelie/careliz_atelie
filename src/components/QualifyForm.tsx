import { useState } from 'react';
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

export default function QualifyForm({ onQualified, onNavigateToLogin }: QualifyFormProps) {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [qtyRange, setQtyRange] = useState('');
  const [urgency, setUrgency] = useState('');
  const [hasFabric, setHasFabric] = useState('');

  const calculateBudget = () => {
    let basePrice = 0;
    switch (serviceType) {
      case 'Ajuste de Roupa':
        basePrice = 50;
        break;
      case 'Confecção sob Medida':
        basePrice = 300;
        break;
      case 'Reforma de Vestido de Festa':
        basePrice = 180;
        break;
      case 'Conserto Geral':
        basePrice = 30;
        break;
      default:
        basePrice = 0;
    }

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

  const isQualifiedForVisit = 
    serviceType === 'Confecção sob Medida' || 
    serviceType === 'Reforma de Vestido de Festa';

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleWhatsAppRedirect = () => {
    const phoneNumber = '5511999999999'; // Substituir pelo número real
    const message = `Olá! Realizei a simulação no site. 
- *Serviço*: ${serviceType}
- *Quantidade*: ${qtyRange}
- *Urgência*: ${urgency}
- *Tecido*: ${hasFabric}
- *Orçamento Estimado*: R$ ${priceMin} - R$ ${priceMax}
Gostaria de tirar algumas dúvidas!`;
    
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleProceedToSchedule = () => {
    onQualified({
      serviceType,
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
        <h1 style={{ fontSize: '2.4rem', margin: 0 }}>Ateliê de Costura</h1>
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
            width: `${(step / 4) * 100}%`,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
          }} />
        </div>

        <div style={{ marginTop: '16px' }} className="animate-fade-in">
          {/* ETAPA 1: TIPO DE SERVIÇO */}
          {step === 1 && (
            <div>
              <h2 style={{ marginBottom: '8px' }}>Que tipo de serviço você precisa?</h2>
              <p style={{ marginBottom: '28px' }}>Selecione a melhor opção correspondente ao seu caso.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Ajuste de Roupa', 'Confecção sob Medida', 'Reforma de Vestido de Festa', 'Conserto Geral'].map((type) => (
                  <label 
                    key={type} 
                    className={`option-select ${serviceType === type ? 'active' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name="serviceType" 
                      value={type} 
                      checked={serviceType === type}
                      onChange={() => setServiceType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 2: QUANTIDADE */}
          {step === 2 && (
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

          {/* ETAPA 3: URGÊNCIA */}
          {step === 3 && (
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

          {/* ETAPA 4: ORÇAMENTO E REDIRECIONAMENTO */}
          {step === 4 && (
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

              {hasFabric && (
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
        {step < 4 && (
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
                (step === 2 && !qtyRange) ||
                (step === 3 && !urgency)
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
