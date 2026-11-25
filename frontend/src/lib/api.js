const messages = {
  'Invalid credentials': 'Usuário ou senha inválidos.',
  'User authentication is not configured': 'O acesso de usuário não está configurado.',
  'Bearer token required or expired': 'Sua sessão expirou. Entre novamente.',
  'Could not load readings': 'Não foi possível carregar as leituras.',
  'User not found': 'Usuário não encontrado.',
  'Invalid or expired setup token': 'A configuração do segundo fator expirou. Entre novamente.',
};

export function friendlyError(message) {
  if (!message) return 'Ocorreu um erro ao consultar o serviço. Tente novamente.';
  if (messages[message]) return messages[message];
  if (/[áàâãéêíóôõúç]/i.test(message)) return message;
  return 'Ocorreu um erro ao consultar o serviço. Tente novamente.';
}

export async function api(path, { token, method = 'GET', body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (body !== undefined) requestHeaders['content-type'] = 'application/json';
  if (token) requestHeaders.authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error('Sem conexão com o serviço.');
    error.status = 0;
    throw error;
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(friendlyError(payload.error));
    error.status = response.status;
    throw error;
  }
  return payload;
}
