import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'TECHNICIAN' | 'ADMIN';
};

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<{ user: CurrentUser }>('/auth/me'),
  });
}
