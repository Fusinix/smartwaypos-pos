import React, { createContext, useContext, useReducer } from 'react';
import type { AuthState, User } from '../types';

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState, (initial) => {
    // Try to recover session from localStorage on initialization
    try {
      const savedUser = localStorage.getItem('pos_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return {
          ...initial,
          user,
          isAuthenticated: true
        };
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    }
    return initial;
  });

  const login = async (username: string, password: string) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const user = await window.electron.invoke('login', username, password);
      const userData = { username: user?.username, id: user?.id, role: user?.role };
      
      // Persist to localStorage
      localStorage.setItem('pos_user', JSON.stringify(userData));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = async () => {
    if (state.user) {
      try {
        await window.electron.invoke('logout', { author: { id: state.user.id, name: state.user.username, role: state.user.role } });
      } catch (e) {
        // Optionally handle error
      }
    }
    // Clear from localStorage
    localStorage.removeItem('pos_user');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 