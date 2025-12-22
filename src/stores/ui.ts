import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Theme state
  theme: Theme;

  // Modal state
  activeModal: string | null;
  modalData: Record<string, unknown> | null;

  // Toast notifications
  toasts: Toast[];

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persist
}

// Generate unique ID for toasts
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Apply theme to document
function applyTheme(theme: Theme): void {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'light',
      activeModal: null,
      modalData: null,
      toasts: [],

      // Sidebar actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      // Theme actions
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        applyTheme(newTheme);
      },

      // Modal actions
      openModal: (modalId, data) => {
        set({ activeModal: modalId, modalData: data ?? null });
      },

      closeModal: () => {
        set({ activeModal: null, modalData: null });
      },

      // Toast actions
      addToast: (toast) => {
        const id = generateId();
        const newToast: Toast = {
          ...toast,
          id,
          duration: toast.duration ?? 5000,
        };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-remove after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, newToast.duration);
        }

        return id;
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      clearToasts: () => {
        set({ toasts: [] });
      },
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// Helper hooks for common patterns
export const useSidebar = () => {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, setSidebarOpen, setSidebarCollapsed } =
    useUIStore();
  return { sidebarOpen, sidebarCollapsed, toggleSidebar, setSidebarOpen, setSidebarCollapsed };
};

export const useTheme = () => {
  const { theme, setTheme, toggleTheme } = useUIStore();
  return { theme, setTheme, toggleTheme };
};

export const useModal = () => {
  const { activeModal, modalData, openModal, closeModal } = useUIStore();
  return { activeModal, modalData, openModal, closeModal };
};

export const useToasts = () => {
  const { toasts, addToast, removeToast, clearToasts } = useUIStore();
  return { toasts, addToast, removeToast, clearToasts };
};
