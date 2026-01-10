
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { UserLayout, AdminLayout } from './components/Layout';
import { UserDashboard } from './pages/user/UserDashboard';
import { UserTasks } from './pages/user/UserTasks';
import { TaskRunner } from './pages/user/TaskRunner';
import { UserWallet } from './pages/user/UserWallet';
import { UserReferrals } from './pages/user/UserReferrals';
import { UserLeaderboard } from './pages/user/UserLeaderboard';
import { UserProfile } from './pages/user/UserProfile';
import { UserGames } from './pages/user/UserGames';
import { SpinWheel } from './pages/user/games/SpinWheel';
import { ScratchCard } from './pages/user/games/ScratchCard';
import { GuessNumber } from './pages/user/games/GuessNumber';
import { Lottery } from './pages/user/games/Lottery';
import { ShortsFeed } from './pages/user/ShortsFeed';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTasks } from './pages/admin/AdminTasks';
import { AdminWithdrawals } from './pages/admin/AdminWithdrawals';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements';
import { AdminGames } from './pages/admin/AdminGames';
import { AdminShorts } from './pages/admin/AdminShorts';
import { AdminAds } from './pages/admin/AdminAds';
import { getCurrentUserId, getUserRole } from './services/mockDb';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: UserRole }> = ({ children, requiredRole }) => {
  const userId = getCurrentUserId();
  const role = getUserRole() || (localStorage.getItem('app_user_role') as UserRole);

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  // Fast-path: If we have basic credentials, let the component handle its own data loading
  if (!role && requiredRole) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === UserRole.ADMIN ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        
        {/* User Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><UserDashboard /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/tasks" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><UserTasks /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/tasks/:taskId" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><TaskRunner /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/shorts" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><ShortsFeed /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/games" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><UserGames /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/games/spin" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><SpinWheel /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/games/scratch" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><ScratchCard /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/games/guess" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><GuessNumber /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/games/lottery" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><Lottery /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><UserWallet /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/friends" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><UserReferrals /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><UserLeaderboard /></UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute requiredRole={UserRole.USER}>
            <UserLayout><UserProfile /></UserLayout>
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminDashboard /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminUsers /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/tasks" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminTasks /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/shorts" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminShorts /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/games" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminGames /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/ads" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminAds /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/withdrawals" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminWithdrawals /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminSettings /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/announcements" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminLayout><AdminAnnouncements /></AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
