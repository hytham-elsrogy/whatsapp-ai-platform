import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/services/api';
import { initSocket, disconnectSocket } from '@/services/socket';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<any>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, twoFactorCode) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password, twoFactorCode });

          if (response.requires2FA) {
            set({ isLoading: false });
            return { requires2FA: true, userId: response.userId };
          }

          const { accessToken, user } = response;
          localStorage.setItem('accessToken', accessToken);

          set({ user, accessToken, isAuthenticated: true, isLoading: false });

          initSocket(accessToken);

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        localStorage.removeItem('accessToken');
        disconnectSocket();
        set({ user: null, accessToken: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      setUser: (user) => set({ user }),

      initialize: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
          initSocket(token);
        } catch {
          localStorage.removeItem('accessToken');
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
