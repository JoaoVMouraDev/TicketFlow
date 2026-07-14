import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, LogOut, Users } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

type AppSidebarProps = {
  role?: string;
};

export function AppSidebar({ role }: AppSidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function handleLogout() {
    localStorage.removeItem('ticketflow_token');
    localStorage.removeItem('ticketflow_user');
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="sidebar" aria-label="Navegacao principal">
      <div className="brand">
        <span className="brand-mark">T</span>
        <strong>TicketFlow</strong>
      </div>

      <nav className="nav-list">
        <NavLink className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} to="/tickets">
          <LayoutDashboard size={18} />
          Painel
        </NavLink>
        {role === 'ADMIN' ? (
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            to="/admin/users"
          >
            <Users size={18} />
            Usuarios
          </NavLink>
        ) : null}
      </nav>

      <button className="nav-item sidebar-logout" onClick={handleLogout} type="button">
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  );
}
