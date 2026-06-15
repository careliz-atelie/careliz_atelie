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
    const { client_name, client_phone, service_type, estimated_price, appointment_date, appointment_time } = body;

    // Configurações do gateway de WhatsApp obtidas pelas variáveis de ambiente do Netlify
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
    const recipientNumber = process.env.WHATSAPP_RECIPIENT_NUMBER; // Telefone da costureira

    if (!whatsappApiUrl || !recipientNumber) {
      console.warn('Variáveis de WhatsApp essenciais não configuradas (URL ou número de destino).');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Agendamento salvo, mas notificação pulada por falta de URL ou número de destino.' }),
      };
    }

    // Formatação da data para o padrão brasileiro
    const formattedDate = appointment_date.split('-').reverse().join('/');
    const formattedTime = appointment_time.slice(0, 5);

    // Corpo da mensagem
    const textMessage = `🧵 *Novo Agendamento Recebido!*\n\n` +
      `👤 *Cliente*: ${client_name}\n` +
      `📞 *Telefone*: ${client_phone}\n` +
      `✂️ *Serviço*: ${service_type}\n` +
      `💰 *Média Orçada*: R$ ${estimated_price}\n` +
      `📅 *Data*: ${formattedDate} às ${formattedTime}\n\n` +
      `👉 _Acesse o painel para gerenciar os compromissos do ateliê._`;

    // Identifica o formato do payload com base na URL do gateway para evitar enviar
    // propriedades misturadas, o que costuma causar erro "400 Bad Request" em APIs estritas.
    let payload = {};
    const lowerUrl = whatsappApiUrl.toLowerCase();

    if (lowerUrl.includes('evolution') || lowerUrl.includes('sendtext') || lowerUrl.includes('send-text')) {
      // Formato Evolution API / Z-API (sendText)
      // Z-API usa 'phone'/'message' no endpoint send-text mas a Evolution usa 'number'/'text' no sendText
      if (lowerUrl.includes('evolution')) {
        payload = {
          number: recipientNumber,
          text: textMessage
        };
      } else {
        payload = {
          phone: recipientNumber,
          message: textMessage
        };
      }
    } else {
      // Formato Padrão / Z-API (caso a URL não possua palavras específicas)
      payload = {
        phone: recipientNumber,
        message: textMessage
      };
    }

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
