import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VehicleDetailModal, { getDaysRemaining } from './VehicleDetailModal';
import type { Vehicle, Driver, Shipment, Expense } from '../../types';

const MOCK_VEHICLE: Vehicle = {
  id: 'v1',
  plateNumber: 'MH01AB1234',
  vehicleType: 'Truck',
  status: 'active',
  currentDriverId: 'd1',
  insuranceExpiry: '2099-12-31',
  permitExpiry: '2099-11-30',
  fitnessExpiry: '2099-10-31',
  pucExpiry: '2099-09-30',
};

const MOCK_DRIVER: Driver = {
  id: 'd1',
  name: 'Raju Kumar',
  phone: '9876543210',
  licenseNumber: 'MH0120230012345',
  status: 'available',
};

const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: 's1',
    tripId: 'T-001',
    containerNumber: 'CONT001',
    origin: 'Mumbai',
    destination: 'Pune',
    status: 'delivered',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 's2',
    tripId: 'T-002',
    containerNumber: 'CONT002',
    origin: 'Delhi',
    destination: 'Agra',
    status: 'in-transit',
    createdAt: '2024-01-10T10:00:00Z',
  },
];

const MOCK_EXPENSES: Expense[] = [
  {
    id: 'e1',
    category: 'Fuel',
    amount: 3500,
    date: '2024-01-15',
    paymentMethod: 'cash',
    status: 'paid',
  },
  {
    id: 'e2',
    category: 'Toll',
    amount: 200,
    date: '2024-01-10',
    paymentMethod: 'online',
    status: 'pending',
  },
];

const baseProps = {
  isOpen: true,
  vehicle: MOCK_VEHICLE,
  driver: MOCK_DRIVER,
  shipments: MOCK_SHIPMENTS,
  expenses: MOCK_EXPENSES,
  onClose: vi.fn(),
};

describe('VehicleDetailModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<VehicleDetailModal {...baseProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders vehicle plate number and type when open', () => {
    render(<VehicleDetailModal {...baseProps} />);
    expect(screen.getByText('MH01AB1234')).toBeInTheDocument();
    expect(screen.getByText('Truck')).toBeInTheDocument();
  });

  it('shows driver details when driver is provided', () => {
    render(<VehicleDetailModal {...baseProps} />);
    expect(screen.getByText('Raju Kumar')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('MH0120230012345')).toBeInTheDocument();
  });

  it('shows "No driver assigned" when driver is null', () => {
    render(<VehicleDetailModal {...baseProps} driver={null} />);
    expect(screen.getByText('No driver assigned')).toBeInTheDocument();
  });

  it('shows all four compliance date labels', () => {
    render(<VehicleDetailModal {...baseProps} />);
    expect(screen.getByText('Insurance')).toBeInTheDocument();
    expect(screen.getByText('Permit')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('PUC')).toBeInTheDocument();
  });

  it('shows EXPIRED badge for past-due compliance dates', () => {
    const expiredVehicle: Vehicle = {
      ...MOCK_VEHICLE,
      insuranceExpiry: '2020-01-01',
    };
    render(<VehicleDetailModal {...baseProps} vehicle={expiredVehicle} />);
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();
  });

  it('shows green badge for compliance dates more than 30 days away', () => {
    render(<VehicleDetailModal {...baseProps} />);
    // All expiry dates are 2099 — should all show days remaining
    const badges = screen.getAllByText(/\d+ days/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders shipment list with trip IDs', () => {
    render(<VehicleDetailModal {...baseProps} />);
    expect(screen.getByText('T-001')).toBeInTheDocument();
    expect(screen.getByText('T-002')).toBeInTheDocument();
  });

  it('shows route for shipments', () => {
    render(<VehicleDetailModal {...baseProps} />);
    expect(screen.getByText(/Mumbai/)).toBeInTheDocument();
    expect(screen.getByText(/Pune/)).toBeInTheDocument();
  });

  it('renders expense list with categories', () => {
    render(<VehicleDetailModal {...baseProps} />);
    expect(screen.getByText('Fuel')).toBeInTheDocument();
    expect(screen.getByText('Toll')).toBeInTheDocument();
  });

  it('shows total expense amount', () => {
    render(<VehicleDetailModal {...baseProps} />);
    // Total of 3500 + 200 = 3700
    expect(screen.getByText(/3,700/)).toBeInTheDocument();
  });

  it('shows empty state when no shipments', () => {
    render(<VehicleDetailModal {...baseProps} shipments={[]} />);
    expect(screen.getByText('No shipments found for this vehicle.')).toBeInTheDocument();
  });

  it('shows empty state when no expenses', () => {
    render(<VehicleDetailModal {...baseProps} expenses={[]} />);
    expect(screen.getByText('No expenses recorded.')).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<VehicleDetailModal {...baseProps} onClose={onClose} />);
    // Multiple close buttons exist (X icon + footer); click the footer one
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<VehicleDetailModal {...baseProps} onClose={onClose} />);
    const backdrop = document.querySelector('.absolute.inset-0');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles missing compliance dates gracefully', () => {
    const noExpiryVehicle: Vehicle = {
      ...MOCK_VEHICLE,
      insuranceExpiry: undefined,
      permitExpiry: undefined,
      fitnessExpiry: undefined,
      pucExpiry: undefined,
    };
    render(<VehicleDetailModal {...baseProps} vehicle={noExpiryVehicle} />);
    const naItems = screen.getAllByText('N/A');
    expect(naItems.length).toBe(4);
  });

  it('renders nothing when vehicle is null', () => {
    const { container } = render(<VehicleDetailModal {...baseProps} vehicle={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows Lifetime Total label in expense section', () => {
    render(<VehicleDetailModal {...baseProps} />);
    expect(screen.getByText('Lifetime Total')).toBeInTheDocument();
  });

  it('has role=dialog and aria-modal on the panel', () => {
    render(<VehicleDetailModal {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

describe('getDaysRemaining', () => {
  it('returns null for undefined input', () => {
    expect(getDaysRemaining(undefined)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(getDaysRemaining('not-a-date')).toBeNull();
  });

  it('returns 0 for today', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    expect(getDaysRemaining(`${yyyy}-${mm}-${dd}`)).toBe(0);
  });

  it('returns negative value for expired date', () => {
    expect(getDaysRemaining('2020-01-01')).toBeLessThan(0);
  });

  it('returns positive value for future date', () => {
    expect(getDaysRemaining('2099-12-31')).toBeGreaterThan(0);
  });

  it('returns correct value for a date 14 days out (red zone)', () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(getDaysRemaining(str)).toBe(14);
  });

  it('returns correct value for a date 29 days out (amber zone)', () => {
    const d = new Date();
    d.setDate(d.getDate() + 29);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(getDaysRemaining(str)).toBe(29);
  });
});
