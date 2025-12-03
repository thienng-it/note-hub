import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LoginPage } from '../pages/LoginPage';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('LoginPage', () => {
  it('renders login form', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByText('NoteHub')).toBeInTheDocument();
    expect(screen.getByText('Welcome back! Sign in to continue')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your username or email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has link to forgot password', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
  });

  it('has link to register', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // Check for proper form labeling
    expect(screen.getByLabelText('Username or Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    
    // Check for proper input types
    expect(screen.getByPlaceholderText('Enter your username or email')).toHaveAttribute('type', 'text');
  });
});
