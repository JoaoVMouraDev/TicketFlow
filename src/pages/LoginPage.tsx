import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

type LoginResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

async function login(payload: LoginPayload): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error('API fora do ar. Inicie o backend em localhost:3333 e tente novamente.');
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? 'Nao foi possivel entrar.');
  }

  return response.json() as Promise<LoginResponse>;
}

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem('ticketflow_token', data.token);
      localStorage.setItem('ticketflow_user', JSON.stringify(data.user));
      queryClient.setQueryData(['auth', 'me'], { user: data.user });
      navigate('/tickets');
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark">T</span>
          <strong>TicketFlow</strong>
        </div>

        <div className="login-heading">
          <h1 id="login-title">Entrar</h1>
          <p>Acesse a central de chamados da equipe.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <span className="login-input">
              <Mail size={18} />
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                required
                type="email"
                value={email}
              />
            </span>
          </label>

          <label>
            Senha
            <span className="login-input">
              <Lock size={18} />
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button className="login-submit" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Entrando...' : 'Entrar'}
          </button>

          {mutation.isError ? (
            <p className="login-error" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
