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

    if (!whatsappApiUrl || !whatsappApiToken || !recipientNumber) {
      console.warn('Variáveis de WhatsApp não configuradas no servidor. O agendamento foi salvo no banco de dados, mas o envio da mensagem foi pulado.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Agendamento salvo, mas notificação pulada por falta de variáveis de ambiente.' }),
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

    // Exemplo de payload para gateways populares (Z-API / Evolution API)
    // Geralmente requer a URL da instância, o cabeçalho de token e um corpo com 'phone' e 'message'
    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappApiToken}`,
        // Alguns gateways usam Client-Token ou Headers customizados:
        'Client-Token': whatsappApiToken,
      },
      body: JSON.stringify({
        // Adaptável de acordo com o provedor (Z-API ou Evolution API)
        phone: recipientNumber,
        message: textMessage,
        // Caso use outro gateway:
        number: recipientNumber,
        text: textMessage
      }),
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
