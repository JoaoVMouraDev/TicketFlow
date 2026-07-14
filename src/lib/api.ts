export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3333' : '';

function redirectToLogin() {
  localStorage.removeItem('ticketflow_token');
  localStorage.removeItem('ticketflow_user');

  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export async function apiFetch<TResponse>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('ticketflow_token');
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('API fora do ar. Inicie o backend em localhost:3333 e tente novamente.', 0, null);
  }

  const data = (await response.json().catch(() => null)) as { message?: string } | null;

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError('Sua sessao expirou. Entre novamente.', 401, data);
  }

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Nao foi possivel concluir a operacao.', response.status, data);
  }

  return data as TResponse;
}
