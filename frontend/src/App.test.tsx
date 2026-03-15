import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';

describe('App', () => {
    it('renders dashboard title', () => {
        render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );

        expect(screen.getByText(/CosmicSec Admin Dashboard/i)).toBeInTheDocument();
    });
});
