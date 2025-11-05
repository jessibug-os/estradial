import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Estradiol Ester Pharmacokinetic Calculator/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders visual timeline', () => {
  render(<App />);
  const scheduleLabel = screen.getByText(/Schedule:/i);
  expect(scheduleLabel).toBeInTheDocument();
});
