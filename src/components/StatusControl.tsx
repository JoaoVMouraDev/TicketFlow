import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

type StatusControlProps = {
  ticketId: string;
  status: TicketStatus;
  onStatusChanged?: (event: StatusChangeEvent) => void;
};

export type StatusChangeEvent = {
  id: string;
  ticketId: string;
  status: TicketStatus;
  label: string;
  changedAt: string;
  actorName: string;
};

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const statusOptions: Array<{ value: TicketStatus; label: string }> = [
  { value: 'OPEN', label: statusLabels.OPEN },
  { value: 'IN_PROGRESS', label: statusLabels.IN_PROGRESS },
  { value: 'RESOLVED', label: statusLabels.RESOLVED },
  { value: 'CLOSED', label: statusLabels.CLOSED },
];

function getCurrentUserName() {
  const rawUser = localStorage.getItem('ticketflow_user');

  if (!rawUser) {
    return 'Voce';
  }

  try {
    const user = JSON.parse(rawUser) as { name?: string };
    return user.name ?? 'Voce';
  } catch {
    return 'Voce';
  }
}

function StatusControl({ ticketId, status, onStatusChanged }: StatusControlProps) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(status);
  const [errorMessage, setErrorMessage] = useState('');
  const [listIsOpen, setListIsOpen] = useState(false);
  const [cooldownIsActive, setCooldownIsActive] = useState(false);
  const cooldownTimerRef = useRef<number | null>(null);

  const mutation = useMutation({
    mutationFn: (nextStatus: TicketStatus) =>
      apiFetch<{ ticket: { status: TicketStatus } }>(`/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      }),
    onSuccess: (_data, nextStatus) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setCooldownIsActive(true);
      cooldownTimerRef.current = window.setTimeout(() => {
        setCooldownIsActive(false);
        cooldownTimerRef.current = null;
      }, 500);
      onStatusChanged?.({
        id: `${ticketId}-${Date.now()}`,
        ticketId,
        status: nextStatus,
        label: statusLabels[nextStatus],
        changedAt: new Date().toISOString(),
        actorName: getCurrentUserName(),
      });
    },
    onError: (error) => {
      setSelectedStatus(status);
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel alterar o status.');
    },
  });
  const disabled = mutation.isPending || cooldownIsActive;

  useEffect(() => {
    setSelectedStatus(status);
  }, [status]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = window.setTimeout(() => setErrorMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  function handleChange(nextStatus: TicketStatus) {
    if (nextStatus === selectedStatus || disabled) {
      setListIsOpen(false);
      return;
    }

    setErrorMessage('');
    setSelectedStatus(nextStatus);
    setListIsOpen(false);
    mutation.mutate(nextStatus);
  }

  return (
    <div className="status-control">
      <span id={`status-label-${ticketId}`}>Status do chamado</span>
      <span className="status-select-shell">
        <button
          aria-controls={`status-options-${ticketId}`}
          aria-expanded={listIsOpen}
          aria-haspopup="listbox"
          aria-labelledby={`status-label-${ticketId}`}
          className="status-select-trigger"
          disabled={disabled}
          onClick={() => setListIsOpen((current) => !current)}
          type="button"
        >
          <span className={`status-dot status-dot-${selectedStatus}`} aria-hidden="true" />
          <span>{statusLabels[selectedStatus]}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>

        {listIsOpen ? (
          <span className="status-options" id={`status-options-${ticketId}`} role="listbox">
            {statusOptions.map((option) => (
              <button
                aria-selected={selectedStatus === option.value}
                className={selectedStatus === option.value ? 'custom-option selected' : 'custom-option'}
                key={option.value}
                onClick={() => handleChange(option.value)}
                role="option"
                type="button"
              >
                <span className={`status-dot status-dot-${option.value}`} aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </span>
        ) : null}
      </span>
      {errorMessage ? (
        <span className="field-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

export default StatusControl;
