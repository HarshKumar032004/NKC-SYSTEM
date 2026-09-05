import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  branchId: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  activeBranchId: string | null;
  
  // Actions
  setAuth: (user: UserProfile, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setBranchId: (branchId: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  activeBranchId: null,

  setAuth: (user, accessToken) => set({ user, accessToken, activeBranchId: user.branchId }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setBranchId: (branchId) => set({ activeBranchId: branchId }),
  logout: async () => {
    try {
      // Call backend to invalidate refresh token in Redis and clear cookie
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore errors - we still want to clear local state
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state
      set({ user: null, accessToken: null, activeBranchId: null });
    }
  },
}));
