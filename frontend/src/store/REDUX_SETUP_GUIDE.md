"""
Frontend State Management Configuration using Redux Toolkit
Advanced state management with built-in async support and DevTools
"""

# This is TypeScript-targeted, but showing the structure and setup guide
# File: frontend/src/store/index.ts

# Redux Store Configuration Example:

STORE_SETUP_GUIDE = """
// frontend/src/store/index.ts

import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import scanReducer from './slices/scanSlice';
import findingReducer from './slices/findingSlice';
import agentReducer from './slices/agentSlice';
import notificationReducer from './slices/notificationSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    scan: scanReducer,
    finding: findingReducer,
    agent: agentReducer,
    notification: notificationReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['scan/setError'],
        ignoredPaths: ['scan.error'],
      },
    })
      .concat([
        // Custom middleware for async operations
        scanMiddleware,
      ]),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export pre-typed hooks for usage in components
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
"""

# Scan Slice Example Structure:

SCAN_SLICE_GUIDE = """
// frontend/src/store/slices/scanSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';

interface ScanState {
  scans: Scan[];
  currentScan: Scan | null;
  loading: boolean;
  error: string | null;
  filters: ScanFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: ScanState = {
  scans: [],
  currentScan: null,
  loading: false,
  error: null,
  filters: {},
  pagination: { page: 1, limit: 10, total: 0 },
};

// Async thunks
export const fetchScans = createAsyncThunk(
  'scan/fetchScans',
  async (filters: ScanFilters, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/scans', { params: filters });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchScanById = createAsyncThunk(
  'scan/fetchById',
  async (scanId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/api/scans/${scanId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createScan = createAsyncThunk(
  'scan/create',
  async (scanData: CreateScanInput, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/scans', scanData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const scanSlice = createSlice({
  name: 'scan',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ScanFilters>) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScans.fulfilled, (state, action) => {
        state.loading = false;
        state.scans = action.payload.scans;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchScans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default scanSlice.reducer;
"""

# API Client Setup guide

API_CLIENT_GUIDE = """
// frontend/src/services/apiClient.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';

let apiClient: AxiosInstance;

export const initializeApiClient = (baseURL: string = import.meta.env.VITE_API_URL) => {
  apiClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Request interceptor for auth
  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor for error handling
  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    initializeApiClient();
  }
  return apiClient;
};
"""

# React Query / TanStack Query Setup Guide

REACT_QUERY_GUIDE = """
// frontend/src/hooks/queries.ts

import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

// Query hooks
export const useScans = (filters?: ScanFilters) => {
  return useQuery({
    queryKey: ['scans', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/scans', { params: filters });
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });
};

export const useScan = (scanId: string | undefined) => {
  return useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => {
      if (!scanId) throw new Error('Scan ID required');
      const response = await apiClient.get(`/api/scans/${scanId}`);
      return response.data;
    },
    enabled: !!scanId,
    refetchInterval: 5000, // Poll every 5s
  });
};

// Mutation hooks
export const useCreateScan = () => {
  return useMutation({
    mutationFn: async (data: CreateScanInput) => {
      const response = await apiClient.post('/api/scans', data);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate scans query to refetch
      // Uses queryClient from provider
    },
  });
};

export const useCancelScan = () => {
  return useMutation({
    mutationFn: async (scanId: string) => {
      const response = await apiClient.post(`/api/scans/${scanId}/cancel`);
      return response.data;
    },
  });
};

// Infinite query for pagination
export const useInfiniteScans = () => {
  return useInfiniteQuery({
    queryKey: ['scans', 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get('/api/scans', {
        params: { page: pageParam, limit: 10 },
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.total_pages
        ? lastPage.pagination.page + 1
        : undefined,
  });
};
"""

# Store types and interfaces

import typing
from typing import Optional, List, Dict, Any

class ScanState(typing.TypedDict):
    """Redux Scan State Structure"""
    scans: List[Dict[str, Any]]
    currentScan: Optional[Dict[str, Any]]
    loading: bool
    error: Optional[str]
    filters: Dict[str, Any]


class FindingState(typing.TypedDict):
    """Redux Finding State Structure"""
    findings: List[Dict[str, Any]]
    selectedFinding: Optional[Dict[str, Any]]
    filters: Dict[str, Any]


class NotificationState(typing.TypedDict):
    """Redux Notification State Structure"""
    notifications: List[Dict[str, Any]]
    unreadCount: int


# Implementation Instructions:

IMPLEMENTATION_STEPS = """
1. Install Redux Toolkit and friends:
   npm install @reduxjs/toolkit react-redux @reduxjs/toolkit-query

2. Create store structure:
   frontend/src/store/
   ├── index.ts                 (store configuration)
   ├── slices/
   │   ├── scanSlice.ts
   │   ├── findingSlice.ts
   │   ├── agentSlice.ts
   │   └── notificationSlice.ts
   └── middleware/
       └── asyncMiddleware.ts

3. Update App.tsx to wrap with Redux Provider:
   import { Provider } from 'react-redux';
   import { store } from './store';
   
   <Provider store={store}>
     <App />
   </Provider>

4. Create custom hooks for typed usage (shown above)

5. Update components to use useAppDispatch and useAppSelector

6. Consider adding Redux DevTools browser extension for debugging
"""
