import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Inbox } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/AppSidebar';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { apiFetch } from '../lib/api';
import { roleLabels } from '../lib/labels';

type UserRole = 'USER' | 'TECHNICIAN' | 'ADMIN';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  _count: { tickets: number };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type UsersResponse = {
  users: AdminUser[];
  pagination: Pagination;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

function UsersSkeleton() {
  return (
    <div className="users-skeleton" aria-label="Carregando usuarios">
      {[0, 1, 2, 3].map((item) => (
        <span className="skeleton-line wide" key={item} />
      ))}
    </div>
  );
}

function UsersPage() {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const currentUserQuery = useCurrentUser();
  const [role, setRole] = useState<UserRole | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const isAdmin = currentUserQuery.data?.user.role === 'ADMIN';

  useEffect(() => {
    if (currentUserQuery.data && !isAdmin) {
      navigate('/tickets', { replace: true });
    }
  }, [currentUserQuery.data, isAdmin, navigate]);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', { role, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });

      if (role !== 'ALL') {
        params.set('role', role);
      }

      return apiFetch<UsersResponse>(`/admin/users?${params.toString()}`);
    },
    enabled: isAdmin,
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;

  function changePage(nextPage: number) {
    setPage(nextPage);
    listRef.current?.scrollTo({ top: 0 });
  }

  if (currentUserQuery.data && !isAdmin) {
    return null;
  }

  return (
    <main className="app-shell">
      <AppSidebar role={currentUserQuery.data?.user.role} />

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Usuarios</h1>
            <p>Contas com acesso ao TicketFlow.</p>
          </div>
        </header>

        <section className="users-panel" aria-labelledby="users-title">
          <div className="panel-heading users-heading">
            <div>
              <h2 id="users-title">Lista de usuarios</h2>
              <p>{pagination ? `${pagination.total} usuarios encontrados` : 'Carregando usuarios'}</p>
            </div>

            <label className="role-filter">
              <span>Função</span>
              <select
                onChange={(event) => {
                  setRole(event.target.value as UserRole | 'ALL');
                  setPage(1);
                }}
                value={role}
              >
                <option value="ALL">Todos</option>
                <option value="USER">{roleLabels.USER}</option>
                <option value="TECHNICIAN">{roleLabels.TECHNICIAN}</option>
                <option value="ADMIN">{roleLabels.ADMIN}</option>
              </select>
            </label>
          </div>

          <div className="users-list-scroll" ref={listRef}>
            {currentUserQuery.isLoading || usersQuery.isLoading ? <UsersSkeleton /> : null}

            {currentUserQuery.isError || usersQuery.isError ? (
              <div className="inline-state">
                <AlertCircle size={24} />
                <strong>Nao foi possivel carregar os usuarios.</strong>
                <button className="secondary-action" onClick={() => usersQuery.refetch()} type="button">
                  Tentar novamente
                </button>
              </div>
            ) : null}

            {!usersQuery.isLoading && !usersQuery.isError && isAdmin && users.length === 0 ? (
              <div className="inline-state">
                <Inbox size={24} />
                <strong>Nenhum usuario encontrado</strong>
                <p>Nao existem contas com a role selecionada.</p>
              </div>
            ) : null}

            {!usersQuery.isLoading && !usersQuery.isError && users.length > 0 ? (
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Função</th>
                      <th>Criado em</th>
                      <th>Chamados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td><span className="role-label">{roleLabels[user.role]}</span></td>
                        <td>{dateFormatter.format(new Date(user.createdAt))}</td>
                        <td>{user._count.tickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <nav className="pagination-controls" aria-label="Paginacao de usuarios">
              <button
                className="secondary-action"
                disabled={page === 1}
                onClick={() => changePage(page - 1)}
                type="button"
              >
                Anterior
              </button>
              <span>Pagina {page} de {pagination.totalPages}</span>
              <button
                className="secondary-action"
                disabled={page === pagination.totalPages || pagination.totalPages === 0}
                onClick={() => changePage(page + 1)}
                type="button"
              >
                Proxima
              </button>
            </nav>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default UsersPage;
