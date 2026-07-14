import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Code2, CreditCard, HardDrive, KeyRound, Network, Shapes, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { ApiError, apiFetch } from '../lib/api';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type Category = 'SOFTWARE' | 'HARDWARE' | 'FINANCE' | 'NETWORK' | 'ACCESS' | 'OTHER';

type CreateTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FieldErrors = Partial<Record<'title' | 'description' | 'priority' | 'category', string>>;

type ApiIssue = {
  path: string[];
  message: string;
};

type ApiErrorBody = {
  message?: string;
  issues?: ApiIssue[];
};

type CreateTicketPayload = {
  title: string;
  description: string;
  priority?: Priority;
  category?: Category;
};

const priorityOptions: Array<{ value: Priority; label: string }> = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

const categoryOptions: Array<{
  value: Category;
  label: string;
  icon: typeof Code2;
}> = [
  { value: 'SOFTWARE', label: 'Software', icon: Code2 },
  { value: 'HARDWARE', label: 'Hardware', icon: HardDrive },
  { value: 'FINANCE', label: 'Financeiro', icon: CreditCard },
  { value: 'NETWORK', label: 'Rede', icon: Network },
  { value: 'ACCESS', label: 'Acesso', icon: KeyRound },
  { value: 'OTHER', label: 'Outro', icon: Shapes },
];

async function createTicket(payload: CreateTicketPayload) {
  return apiFetch<{ ticket: unknown }>('/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function getApiFieldErrors(error: Error | null): FieldErrors {
  const issues = error instanceof ApiError ? (error.data as ApiErrorBody | null)?.issues : undefined;

  if (!issues?.length) {
    return {};
  }

  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0];

    if (field === 'title' || field === 'description' || field === 'priority' || field === 'category') {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}

function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [category, setCategory] = useState<Category>('SOFTWARE');
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [priorityListIsOpen, setPriorityListIsOpen] = useState(false);
  const [categoryListIsOpen, setCategoryListIsOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      closeModal();
    },
  });

  const apiFieldErrors = getApiFieldErrors(mutation.error);
  const hasApiFieldErrors = Object.keys(apiFieldErrors).length > 0;
  const fieldErrors = hasApiFieldErrors ? apiFieldErrors : clientErrors;
  const titleIsValid = title.trim().length >= 3;
  const descriptionIsValid = description.trim().length >= 5;
  const canSubmit = titleIsValid && descriptionIsValid && !mutation.isPending;

  const selectedCategory = useMemo(
    () => categoryOptions.find((option) => option.value === category) ?? categoryOptions[0],
    [category],
  );
  const selectedPriority = useMemo(
    () => priorityOptions.find((option) => option.value === priority) ?? priorityOptions[1],
    [priority],
  );
  const SelectedCategoryIcon = selectedCategory.icon;

  function resetForm() {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setCategory('SOFTWARE');
    setClientErrors({});
    setPriorityListIsOpen(false);
    setCategoryListIsOpen(false);
    mutation.reset();
  }

  function closeModal() {
    resetForm();
    onClose();
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!titleIsValid) {
      nextErrors.title = 'Titulo deve ter pelo menos 3 caracteres.';
    }

    if (!descriptionIsValid) {
      nextErrors.description = 'Descricao deve ter pelo menos 5 caracteres.';
    }

    setClientErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();

    if (!validateForm()) {
      return;
    }

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
    });
  }

  function handleBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (priorityListIsOpen) {
        setPriorityListIsOpen(false);
        return;
      }
      if (categoryListIsOpen) {
        setCategoryListIsOpen(false);
        return;
      }
      closeModal();
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) {
      return;
    }

    const focusableElements = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      ),
    );

    if (!focusableElements.length) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => titleRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const formError =
    mutation.isError && !hasApiFieldErrors
      ? mutation.error.message
      : '';

  return (
    <div className="modal-overlay" onClick={handleBackdropClick} onKeyDown={handleKeyDown}>
      <div
        aria-labelledby="create-ticket-title"
        aria-modal="true"
        className="ticket-modal"
        ref={modalRef}
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <h2 id="create-ticket-title">Novo chamado</h2>
            <p>Registre uma solicitacao para a fila de atendimento.</p>
          </div>
          <button className="icon-action" onClick={closeModal} type="button" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <form className="ticket-form" onSubmit={handleSubmit}>
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <label>
            Titulo
            <span className="form-control">
              <input
                aria-describedby={fieldErrors.title ? 'ticket-title-error' : undefined}
                aria-invalid={Boolean(fieldErrors.title)}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Acesso bloqueado ao sistema"
                ref={titleRef}
                type="text"
                value={title}
              />
            </span>
            {fieldErrors.title ? (
              <span className="field-error" id="ticket-title-error">
                {fieldErrors.title}
              </span>
            ) : null}
          </label>

          <label>
            Descricao
            <span className="form-control form-control-textarea">
              <textarea
                aria-describedby={
                  fieldErrors.description ? 'ticket-description-error ticket-description-count' : 'ticket-description-count'
                }
                aria-invalid={Boolean(fieldErrors.description)}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Conte o que aconteceu e qual impacto para a equipe."
                rows={4}
                value={description}
              />
            </span>
            <span className="description-helper" id="ticket-description-count">
              {description.trim().length}/5 minimo
            </span>
            {fieldErrors.description ? (
              <span className="field-error" id="ticket-description-error">
                {fieldErrors.description}
              </span>
            ) : null}
          </label>

          <div className="form-grid">
            <label>
              Prioridade
              <span className="priority-select">
                <button
                  aria-controls="ticket-priority-options"
                  aria-describedby={fieldErrors.priority ? 'ticket-priority-error' : undefined}
                  aria-expanded={priorityListIsOpen}
                  aria-haspopup="listbox"
                  aria-invalid={Boolean(fieldErrors.priority)}
                  className="custom-select-trigger"
                  onClick={() => {
                    setCategoryListIsOpen(false);
                    setPriorityListIsOpen((current) => !current);
                  }}
                  type="button"
                >
                  <span className={`priority-dot priority-dot-${priority}`} aria-hidden="true" />
                  <span>{selectedPriority.label}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>

                {priorityListIsOpen ? (
                  <span className="custom-options" id="ticket-priority-options" role="listbox">
                    {priorityOptions.map((option) => (
                      <button
                        aria-selected={priority === option.value}
                        className={priority === option.value ? 'custom-option selected' : 'custom-option'}
                        key={option.value}
                        onClick={() => {
                          setPriority(option.value);
                          setPriorityListIsOpen(false);
                        }}
                        role="option"
                        type="button"
                      >
                        <span
                          className={`priority-dot priority-dot-${option.value}`}
                          aria-hidden="true"
                        />
                      {option.label}
                      </button>
                    ))}
                  </span>
                ) : null}
              </span>
              {fieldErrors.priority ? (
                <span className="field-error" id="ticket-priority-error">
                  {fieldErrors.priority}
                </span>
              ) : null}
            </label>

            <label>
              Categoria
              <span className="priority-select">
                <button
                  aria-controls="ticket-category-options"
                  aria-describedby={fieldErrors.category ? 'ticket-category-error' : undefined}
                  aria-expanded={categoryListIsOpen}
                  aria-haspopup="listbox"
                  aria-invalid={Boolean(fieldErrors.category)}
                  className="custom-select-trigger"
                  onClick={() => {
                    setPriorityListIsOpen(false);
                    setCategoryListIsOpen((current) => !current);
                  }}
                  type="button"
                >
                  <SelectedCategoryIcon size={16} aria-hidden="true" />
                  <span>{selectedCategory.label}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>

                {categoryListIsOpen ? (
                  <span className="custom-options" id="ticket-category-options" role="listbox">
                    {categoryOptions.map((option) => {
                      const CategoryIcon = option.icon;

                      return (
                        <button
                          aria-selected={category === option.value}
                          className={category === option.value ? 'custom-option selected' : 'custom-option'}
                          key={option.value}
                          onClick={() => {
                            setCategory(option.value);
                            setCategoryListIsOpen(false);
                          }}
                          role="option"
                          type="button"
                        >
                          <CategoryIcon size={16} aria-hidden="true" />
                          {option.label}
                        </button>
                      );
                    })}
                  </span>
                ) : null}
              </span>
              {fieldErrors.category ? (
                <span className="field-error" id="ticket-category-error">
                  {fieldErrors.category}
                </span>
              ) : null}
            </label>
          </div>

          <div className="modal-actions">
            <button className="secondary-action" onClick={closeModal} type="button">
              Cancelar
            </button>
            <button className="primary-action" disabled={!canSubmit} type="submit">
              {mutation.isPending ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Criando...
                </>
              ) : (
                'Criar chamado'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTicketModal;
