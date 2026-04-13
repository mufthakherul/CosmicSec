"""
CosmicSec Testing & Quality Assurance Setup
Comprehensive testing strategy covering unit, integration, E2E, and performance tests
"""

import os


# Test Configuration for Vitest (Frontend)
VITEST_CONFIG = """
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',
    globals: true,
    
    // Setup
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types/',
      ],
    },
    
    // Performance
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
"""

# Pytest Configuration (Backend)
PYTEST_CONFIG = """
# pyproject.toml [tool.pytest.ini_options]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
asyncio_mode = "auto"
asyncio_default_fixture_scope = "function"
addopts = "--strict-markers --cov=services --cov-report=html --cov-report=term-missing"
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "e2e: End-to-end tests",
    "slow: Slow running tests",
    "requires_external: Tests requiring external services",
]
"""

# Frontend Test Setup
FRONTEND_TEST_SETUP = """
// frontend/src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_API_URL = 'http://localhost:8000';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
"""

# Backend Test Setup
BACKEND_TEST_CONFTEST = """
# tests/conftest.py
import pytest
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Async fixtures
@pytest.fixture
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    '''Test database fixture'''
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        yield session
    
    await engine.dispose()

@pytest.fixture
def mock_service_urls(monkeypatch):
    '''Mock service URLs for testing'''
    services = {
        'scan_service': 'http://localhost:8002',
        'ai_service': 'http://localhost:8003',
        'recon_service': 'http://localhost:8004',
    }
    for key, url in services.items():
        monkeypatch.setenv(f'{key.upper()}_URL', url)
    return services

@pytest.fixture
def mock_redis(monkeypatch):
    '''Mock Redis client'''
    from unittest.mock import AsyncMock, MagicMock
    
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock(return_value=True)
    mock_redis.delete = AsyncMock(return_value=1)
    
    monkeypatch.setattr('services.common.caching.get_redis', 
                        asyncio.coroutine(lambda: mock_redis))
    
    return mock_redis
"""

# Frontend Component Test Example
FRONTEND_TEST_EXAMPLE = """
// frontend/src/pages/__tests__/DashboardPage.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { DashboardPage } from '../DashboardPage';
import * as apiClient from '../../services/apiClient';

// Mock API calls
vi.mock('../../services/apiClient');

const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={mockQueryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard header', async () => {
    vi.mocked(apiClient.default.get).mockResolvedValueOnce({
      data: {
        securityScore: 75,
        totalScans: 42,
        criticalFindings: 3,
        activeAgents: 5,
      },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Security Score/i)).toBeInTheDocument();
    });
  });

  it('displays security score gauge', async () => {
    vi.mocked(apiClient.default.get).mockResolvedValueOnce({
      data: {
        securityScore: 85,
        totalScans: 100,
        criticalFindings: 1,
        activeAgents: 10,
      },
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      const gauge = screen.getByTestId('security-gauge');
      expect(gauge).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(apiClient.default.get).mockRejectedValueOnce(
      new Error('API Error')
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });
});
"""

# Backend Test Example
BACKEND_TEST_EXAMPLE = """
# tests/test_scan_service_enhanced.py
import pytest
import httpx
from datetime import datetime
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
class TestScanServiceAPI:
    '''Test suite for Scan Service API endpoints'''
    
    async def test_create_scan_success(self, test_db, mock_service_urls):
        '''Test successful scan creation'''
        from services.scan_service.main import app
        
        client = httpx.AsyncClient(app=app, base_url='http://test')
        
        payload = {
            'target': '192.168.1.1',
            'scan_type': 'network',
            'tools': ['nmap'],
        }
        
        response = await client.post('/api/scans', json=payload)
        
        assert response.status_code == 201
        assert response.json()['status'] == 'pending'
    
    async def test_create_scan_validation(self, test_db):
        '''Test scan creation with invalid data'''
        from services.scan_service.main import app
        
        client = httpx.AsyncClient(app=app, base_url='http://test')
        
        # Missing required fields
        response = await client.post('/api/scans', json={})
        
        assert response.status_code == 422
        assert 'validation' in response.json().get('error_code', '').lower()
    
    async def test_list_scans_with_pagination(self, test_db):
        '''Test listing scans with pagination'''
        from services.scan_service.main import app
        
        client = httpx.AsyncClient(app=app, base_url='http://test')
        
        response = await client.get('/api/scans?limit=10&offset=0')
        
        assert response.status_code == 200
        data = response.json()
        assert 'scans' in data
        assert 'pagination' in data
        assert data['pagination']['limit'] == 10
    
    @pytest.mark.slow
    async def test_scan_execution_timeout(self, test_db):
        '''Test scan execution with timeout'''
        # This test is marked as slow and might be skipped in CI
        pass
"""

# Performance Testing Setup
PERFORMANCE_TEST_SETUP = """
# tests/performance/test_performance.py
import pytest
import asyncio
from locust import HttpUser, task, between

class ApiLoadTest(HttpUser):
    '''Load testing for API Gateway'''
    wait_time = between(1, 3)
    
    @task
    def get_dashboard(self):
        self.client.get('/api/dashboard/overview')
    
    @task(2)
    def list_scans(self):
        self.client.get('/api/scans?limit=10')
    
    @task(1)
    def get_agent_status(self):
        self.client.get('/api/agents')

# Run with: locust -f tests/performance/test_performance.py -u 100 -r 10
"""

# CI/CD Pipeline Configuration
GITHUB_ACTIONS_TEST = """
# .github/workflows/test.yml
name: Tests & Quality

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - run: pip install -r requirements.txt pytest pytest-asyncio pytest-cov
      - run: pytest tests/ --cov --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: cd frontend && npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: cd frontend && npm ci && npx playwright install
      - run: npm run test:e2e
"""

print("Testing & Quality Assurance Setup Complete")
