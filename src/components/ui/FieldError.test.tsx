import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FieldError } from './FieldError';

describe('FieldError', () => {
  it('renders the error message when provided', () => {
    render(<FieldError message="This field is required." />);
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required.');
  });

  it('renders nothing when message is undefined', () => {
    const { container } = render(<FieldError />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when message is empty string', () => {
    const { container } = render(<FieldError message="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
