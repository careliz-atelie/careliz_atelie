import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Liberar requisições CORS de teste local
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { 
      client_name, 
      client_phone, 
      service_type, 
      estimated_price, 
      appointment_date, 
      appointment_time,
      custom_jid,
      custom_text
    } = body;

    // Configurações do gateway de WhatsApp obtidas pelas variáveis de ambiente do Netlify
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
    const recipientJid = process.env.WHATSAPP_JID || process.env.WHATSAPP_RECIPIENT_NUMBER;

    if (!whatsappApiUrl || !recipientJid) {
      console.warn('Variáveis de WhatsApp essenciais não configuradas (URL ou JID do destinatário).');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Agendamento salvo, mas notificação pulada por falta de URL ou JID.' }),
      };
    }

    let targetJid = recipientJid;
    let textMessage = '';

    if (custom_jid && custom_text) {
      targetJid = custom_jid;
      // Se o JID padrão do servidor usar o sufixo @s.whatsapp.net, garante que o customizado também use se for apenas números
      if (recipientJid.endsWith('@s.whatsapp.net') && !targetJid.includes('@')) {
        targetJid = `${targetJid}@s.whatsapp.net`;
      }
      textMessage = custom_text;
    } else {
      // Formatação da data para o padrão brasileiro
      const formattedDate = appointment_date.split('-').reverse().join('/');
      const formattedTime = appointment_time.slice(0, 5);

      // Corpo da mensagem formatado conforme solicitado
      textMessage = `novo agendamento disponivel\n` +
        `cliente: ${client_name}\n` +
        `data: ${formattedDate} às ${formattedTime}\n` +
        `valor estimado do orçamento: ${estimated_price}\n` +
        `numero: ${client_phone}\n` +
        `serviço: ${service_type}\n` +
        `confirme o agendamento em:\n` +
        `https://carelizatelie.netlify.app/admin`;
    }

    const payload = {
      jid: targetJid,
      text: textMessage
    };

    // Monta os headers dinamicamente dependendo se o token foi fornecido
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
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erro na resposta do gateway de WhatsApp: ${response.statusText}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Notificação enviada com sucesso!' }),
    };
  } catch (err: any) {
    console.error('Erro na Netlify Function:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
