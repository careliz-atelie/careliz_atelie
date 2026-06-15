import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

const reportHandler = async (event: any) => {
  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
  const recipientJid = process.env.WHATSAPP_JID || process.env.WHATSAPP_RECIPIENT_NUMBER;

  if (!whatsappApiUrl || !recipientJid) {
    console.warn('Variáveis do WhatsApp não configuradas para o relatório diário.');
    return { statusCode: 200 };
  }

  try {
    // Obter data atual ajustada para o fuso horário de Brasília (UTC-3)
    const today = new Date();
    const brOffset = -3;
    const localTime = new Date(today.getTime() + (brOffset * 60 * 60 * 1000) + (today.getTimezoneOffset() * 60 * 1000));
    const todayStr = localTime.toISOString().split('T')[0];

    // 1. Buscar produções de hoje
    const { data: prodData } = await supabase
      .from('appointments')
      .select('id')
      .eq('production_date', todayStr)
      .neq('status', 'canceled');

    // 2. Buscar entregas de hoje
    const { data: delivData } = await supabase
      .from('appointments')
      .select('id')
      .eq('delivery_date', todayStr)
      .neq('status', 'canceled');

    // 3. Buscar agendamentos de hoje
    const { data: apptData } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', todayStr)
      .neq('status', 'canceled');

    // 4. Buscar agendamentos pendentes
    const { data: pendingData } = await supabase
      .from('appointments')
      .select('id')
      .eq('status', 'pending');

    const prodCount = prodData?.length || 0;
    const delivCount = delivData?.length || 0;
    const apptCount = apptData?.length || 0;
    const pendingCount = pendingData?.length || 0;

    const formattedDate = todayStr.split('-').reverse().join('/');

    // Montar o corpo da mensagem
    const textMessage = `novo agendamento disponivel\n` + // mantém tag ou cabeçalho se o gateway precisar, adaptado para o mini relatório
      `*Resumo Diário - Careliz Ateliê*\n` +
      `Bom dia, Carolina! Aqui está o resumo de hoje (${formattedDate}):\n\n` +
      `⚙️ *Produções de Hoje*: ${prodCount}\n` +
      `📦 *Entregas/Retiradas*: ${delivCount}\n` +
      `📅 *Visitas de Clientes*: ${apptCount}\n` +
      `🔔 *Agendamentos Pendentes*: ${pendingCount}\n\n` +
      `Para ver todos os detalhes e gerenciar as tarefas, acesse:\n` +
      `https://carelizatelie.netlify.app/admin`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (whatsappApiToken) {
      requestHeaders['Authorization'] = `Bearer ${whatsappApiToken}`;
      requestHeaders['Client-Token'] = whatsappApiToken;
    }

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        jid: recipientJid,
        text: textMessage
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na resposta do gateway de WhatsApp: ${response.statusText}`);
    }

    console.log('Relatório diário enviado com sucesso!');
    return { statusCode: 200 };
  } catch (err) {
    console.error('Erro no relatório diário:', err);
    return { statusCode: 500 };
  }
};

// Configura a execução para rodar diariamente às 11:00 UTC (08:00 Horário de Brasília)
export const handler = schedule('0 11 * * *', reportHandler);
