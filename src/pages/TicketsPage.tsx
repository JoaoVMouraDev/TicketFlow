import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageSquare,
  Plus,
  Search,
  Send,
  Ticket,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from '../components/AppSidebar';
import CreateTicketModal from '../components/CreateTicketModal';
import StatusControl from '../components/StatusControl';
import type { StatusChangeEvent } from '../components/StatusControl';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { apiFetch } from '../lib/api';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type Category = 'SOFTWARE' | 'HARDWARE' | 'FINANCE' | 'NETWORK' | 'ACCESS' | 'OTHER';

type UserSummary = {
  id: string;
  name: string;
  email?: string;
};

type TicketListItem = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: Category;
  createdBy: Required<UserSummary>;
  _count: {
    comments: number;
  };
  createdAt: string;
  updatedAt: string;
};

type TicketComment = {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
};

type TicketDetail = Omit<TicketListItem, '_count'> & {
  comments: TicketComment[];
};

type TicketListResponse = {
  tickets: TicketListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type TicketDetailResponse = {
  ticket: TicketDetail;
};

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const priorityLabels: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const categoryLabels: Record<Category, string> = {
  SOFTWARE: 'Software',
  HARDWARE: 'Hardware',
  FINANCE: 'Financeiro',
  NETWORK: 'Rede',
  ACCESS: 'Acesso',
  OTHER: 'Outro',
};

function buildTicketsPath(status: TicketStatus | 'ALL', search: string, page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  if (status !== 'ALL') {
    params.set('status', status);
  }

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const queryString = params.toString();
  return queryString ? `/tickets?${queryString}` : '/tickets';
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(diffInSeconds) >= secondsInUnit) {
      return formatter.format(Math.round(diffInSeconds / secondsInUnit), unit);
    }
  }

  return formatter.format(diffInSeconds, 'second');
}

function formatTicketId(id: string) {
  return `#${id.slice(0, 8)}`;
}

function TicketListSkeleton() {
  return (
    <div className="ticket-list" aria-label="Carregando chamados">
      {[0, 1, 2].map((item) => (
        <article className="ticket-row skeleton-card" key={item}>
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
          <span className="ticket-row-bottom">
            <span className="skeleton-pill" />
            <span className="skeleton-pill" />
            <span className="skeleton-pill small" />
          </span>
        </article>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <aside className="detail-panel" aria-label="Carregando detalhe">
      <span className="skeleton-line" />
      <span className="skeleton-line wide" />
      <span className="skeleton-block" />
      <div className="detail-meta">
        <span className="skeleton-block compact" />
        <span className="skeleton-block compact" />
        <span className="skeleton-block compact" />
        <span className="skeleton-block compact" />
      </div>
    </aside>
  );
}

function EmptyDetailPanel() {
  return (
    <aside className="detail-panel empty-state" aria-label="Nenhum chamado selecionado">
      <Inbox size={34} />
      <h2>Selecione um chamado na fila</h2>
      <p>Os detalhes, historico e respostas aparecem aqui.</p>
    </aside>
  );
}

function TicketsPage() {
  const navigate = useNavigate();
  const { id: selectedTicketId } = useParams();
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const currentUserQuery = useCurrentUser();
  const [filter, setFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [draftComment, setDraftComment] = useState('');
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [statusEvents, setStatusEvents] = useState<StatusChangeEvent[]>([]);

  const ticketsQuery = useQuery({
    queryKey: ['tickets', { status: filter, search, page }],
    queryFn: () => apiFetch<TicketListResponse>(buildTicketsPath(filter, search, page)),
  });

  const metricQueries = useQueries({
    queries: (['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((status) => ({
      queryKey: ['tickets', 'metrics', status],
      queryFn: () => apiFetch<TicketListResponse>(buildTicketsPath(status, '', 1, 1)),
    })),
  });

  const detailQuery = useQuery({
    queryKey: ['ticket', selectedTicketId],
    queryFn: () => apiFetch<TicketDetailResponse>(`/tickets/${selectedTicketId}`),
    enabled: Boolean(selectedTicketId),
  });

  const commentMutation = useMutation({
    mutationFn: (message: string) =>
      apiFetch<{ comment: TicketComment }>(`/tickets/${selectedTicketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      setDraftComment('');
      queryClient.invalidateQueries({ queryKey: ['ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const tickets = ticketsQuery.data?.tickets ?? [];
  const pagination = ticketsQuery.data?.pagination;
  const selectedTicket = detailQuery.data?.ticket;
  const filteredCountLabel = ticketsQuery.isLoading
    ? 'Carregando chamados'
    : `${pagination?.total ?? 0} chamados encontrados`;
  const draftCommentIsValid = draftComment.trim().length > 0;
  const metricsAreLoading = metricQueries.some((query) => query.isLoading);
  const metricTotals = metricQueries.map((query) => query.data?.pagination.total ?? 0);

  const metrics = [
    {
      label: 'Total',
      value: metricTotals[0],
      icon: Ticket,
      tone: 'purple',
    },
    {
      label: 'Abertos',
      value: metricTotals[1],
      icon: AlertCircle,
      tone: 'orange',
    },
    {
      label: 'Em andamento',
      value: metricTotals[2],
      icon: Clock3,
      tone: 'blue',
    },
    {
      label: 'Resolvidos',
      value: metricTotals[3],
      icon: CheckCircle2,
      tone: 'green',
    },
  ];

  function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftCommentIsValid || !selectedTicketId || commentMutation.isPending) {
      return;
    }

    commentMutation.mutate(draftComment.trim());
  }

  function handleStatusChange(value: TicketStatus | 'ALL') {
    setFilter(value);
    setPage(1);
    navigate('/tickets');
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    listRef.current?.scrollTo({ top: 0 });
  }

  function handleDetailStatusChanged(event: StatusChangeEvent) {
    setStatusEvents((currentEvents) => [event, ...currentEvents]);
  }

  return (
    <main className="app-shell">
      <AppSidebar role={currentUserQuery.data?.user.role} />

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Central de chamados</h1>
            <p>Atendimento interno para problemas, solicitacoes e historico da equipe.</p>
          </div>

          <button className="primary-action" onClick={() => setCreateModalIsOpen(true)} type="button">
            <Plus size={18} />
            Novo chamado
          </button>
        </header>

        <section className="metrics-grid" aria-label="Resumo dos chamados">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article className="metric-card" data-tone={metric.tone} key={metric.label}>
                <span className="metric-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{metricsAreLoading ? '...' : metric.value}</strong>
                  <p>{metric.label}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="content-grid">
          <section className="ticket-panel" id="tickets">
            <div className="panel-heading">
              <div>
                <h2>Fila de atendimento</h2>
                <p>{filteredCountLabel}</p>
              </div>
            </div>

            <label className="search-field">
              <Search size={18} />
              <input
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar chamado, categoria ou solicitante"
                type="search"
                value={search}
              />
            </label>

            <div className="filter-tabs" aria-label="Filtro por status">
              {[
                ['ALL', 'Todos'],
                ['OPEN', 'Abertos'],
                ['IN_PROGRESS', 'Andamento'],
                ['RESOLVED', 'Resolvidos'],
              ].map(([value, label]) => (
                <button
                  className={filter === value ? 'active' : ''}
                  key={value}
                  onClick={() => handleStatusChange(value as TicketStatus | 'ALL')}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="ticket-list-scroll" ref={listRef}>
              {ticketsQuery.isLoading ? <TicketListSkeleton /> : null}

              {ticketsQuery.isError ? (
              <div className="inline-state">
                <AlertCircle size={24} />
                <strong>Nao foi possivel carregar a fila.</strong>
                <p>Confira se a API esta rodando e tente novamente.</p>
                <button className="secondary-action" onClick={() => ticketsQuery.refetch()} type="button">
                  Tentar novamente
                </button>
              </div>
              ) : null}

              {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length === 0 ? (
              <div className="inline-state">
                <Inbox size={24} />
                <strong>Nenhum chamado por aqui ainda</strong>
                <p>Crie o primeiro chamado para iniciar a fila de atendimento.</p>
                <button className="primary-action" onClick={() => setCreateModalIsOpen(true)} type="button">
                  <Plus size={18} />
                  Novo chamado
                </button>
              </div>
              ) : null}

              {!ticketsQuery.isLoading && !ticketsQuery.isError && tickets.length > 0 ? (
              <div className="ticket-list">
                {tickets.map((ticket) => (
                  <button
                    className={ticket.id === selectedTicketId ? 'ticket-row selected' : 'ticket-row'}
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    type="button"
                  >
                    <span className="ticket-row-top">
                      <strong>{ticket.title}</strong>
                      <small>{formatRelativeTime(ticket.updatedAt)}</small>
                    </span>
                    <span className="ticket-row-meta">
                      <span>
                        {formatTicketId(ticket.id)} - {ticket.createdBy.name}
                      </span>
                      <span className="category-badge">{categoryLabels[ticket.category]}</span>
                    </span>
                    <span className="ticket-row-bottom">
                      <span className={`status status-${ticket.status}`}>
                        {statusLabels[ticket.status]}
                      </span>
                      <span className={`priority priority-${ticket.priority}`}>
                        {priorityLabels[ticket.priority]}
                      </span>
                      <span className="comment-count">
                        <MessageSquare size={14} />
                        {ticket._count.comments}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              ) : null}
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <nav className="pagination-controls" aria-label="Paginacao de chamados">
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

          {!selectedTicketId ? <EmptyDetailPanel /> : null}

          {selectedTicketId && detailQuery.isLoading ? <DetailSkeleton /> : null}

          {selectedTicketId && detailQuery.isError ? (
            <aside className="detail-panel empty-state" aria-label="Chamado nao encontrado">
              <AlertCircle size={34} />
              <h2>Chamado nao encontrado</h2>
              <p>Ele pode ter sido removido ou voce nao tem mais acesso.</p>
              <button className="secondary-action" onClick={() => navigate('/tickets')} type="button">
                Voltar para a lista
              </button>
            </aside>
          ) : null}

          {selectedTicketId && selectedTicket && !detailQuery.isLoading && !detailQuery.isError ? (
            <aside className="detail-panel" aria-label="Detalhes do chamado">
              <div className="detail-top">
                <span className={`status status-${selectedTicket.status}`}>{formatTicketId(selectedTicket.id)}</span>
                <button className="icon-action" type="button" aria-label="Abrir chamado">
                  <ArrowUpRight size={18} />
                </button>
              </div>

              <h2>{selectedTicket.title}</h2>
              <p className="detail-description">{selectedTicket.description}</p>

              <div className="detail-meta">
                <div>
                  <span>Solicitante</span>
                  <strong>{selectedTicket.createdBy.name}</strong>
                </div>
                <div>
                  <span>Categoria</span>
                  <strong>{categoryLabels[selectedTicket.category]}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <StatusControl
                    status={selectedTicket.status}
                    ticketId={selectedTicket.id}
                    onStatusChanged={handleDetailStatusChanged}
                  />
                </div>
                <div>
                  <span>Prioridade</span>
                  <strong>{priorityLabels[selectedTicket.priority]}</strong>
                </div>
              </div>

              <div className="timeline">
                <h3>Historico</h3>
                <article>
                  <span />
                  <div>
                    <strong>Chamado recebido</strong>
                    <p>{formatRelativeTime(selectedTicket.createdAt)}</p>
                  </div>
                </article>

                {statusEvents
                  .filter((event) => event.ticketId === selectedTicket.id)
                  .map((event) => (
                    <article key={event.id}>
                      <span />
                      <div>
                        <strong>{event.actorName}</strong>
                        <p>Status alterado para {event.label}</p>
                        <small>{formatRelativeTime(event.changedAt)}</small>
                      </div>
                    </article>
                  ))}

                {selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map((comment) => (
                    <article key={comment.id}>
                      <span />
                      <div>
                        <strong>{comment.user.name}</strong>
                        <p>{comment.message}</p>
                        <small>{formatRelativeTime(comment.createdAt)}</small>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="timeline-empty">Nenhum comentario ainda.</p>
                )}
              </div>

              <form className="comment-box" onSubmit={handleCommentSubmit}>
                <input
                  onChange={(event) => setDraftComment(event.target.value)}
                  placeholder="Escrever resposta para o solicitante"
                  type="text"
                  value={draftComment}
                />
                <button
                  disabled={!draftCommentIsValid || commentMutation.isPending}
                  type="submit"
                  aria-label="Enviar comentario"
                >
                  <Send size={18} />
                </button>
              </form>
            </aside>
          ) : null}
        </section>
      </section>

      <CreateTicketModal
        isOpen={createModalIsOpen}
        onClose={() => setCreateModalIsOpen(false)}
      />
    </main>
  );
}

export default TicketsPage;
