import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import TicketsPage from './pages/TicketsPage';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<Navigate replace to="/login" />} path="/register" />
      <Route element={<TicketsPage />} path="/tickets" />
      <Route element={<TicketsPage />} path="/tickets/:id" />
      <Route element={<UsersPage />} path="/admin/users" />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
}

export default App;
