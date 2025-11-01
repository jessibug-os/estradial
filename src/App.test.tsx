import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Estradiol Ester Pharmacokinetic Calculator/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders instructions when no dose selected', () => {
  render(<App />);
  const instructionsElement = screen.getByText(/Click on any day in the calendar/i);
  expect(instructionsElement).toBeInTheDocument();
});
