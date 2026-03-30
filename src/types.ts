export interface User {
  id: string;
  email: string;
  role: 'CHA' | 'Transporter' | 'admin';
  companyName: string;
  phoneNumber: string;
  gstin: string;
  pan: string;
  address: string;
  chaLicenseNumber?: string;
  transportLicenseNumber?: string;
  fleetSize?: '1-10' | '11-50' | '50+';
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Vehicle {
  id?: string;
  userId?: string;
  plateNumber: string;
  vehicleType: string;
  status: 'active' | 'maintenance' | 'inactive';
  isAvailable?: boolean;
  currentDriverId?: string;
  insuranceExpiry?: string;
  permitExpiry?: string;
  fitnessExpiry?: string;
  pucExpiry?: string;
}

export interface Driver {
  id?: string;
  userId?: string;
  name: string;
  phone?: string;
  licenseNumber: string;
  status: 'available' | 'on-trip' | 'off-duty';
  currentVehicleId?: string;
  currentVehicleNumber?: string;
  bankAccount?: string;
  ifsc?: string;
  upiId?: string;
}

export interface Shipment {
  id?: string;
  userId?: string;
  orderId?: string; // Link to Order
  tripId: string;
  containerNumber: string;
  containerSize?: '20 ft' | '40 ft';
  origin: string;
  destination: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'cancelled';
  vehicleId?: string;
  vehicleNumber?: string;
  driverId?: string;
  driverName?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  billingPartyName?: string;
  consigneeName?: string;
  lrNumber?: string;
  isLolo?: boolean;
  yardSelection?: string;
  movementType?: 'Import' | 'Export' | 'Rail';
  sealNumber?: string;
  isLocked?: boolean;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  isBillingSameAsConsignee?: boolean;
}

export interface Order {
  id?: string;
  userId?: string;
  orderNumber: string;
  billingPartyName: string;
  consigneeName?: string;
  isBillingSameAsConsignee: boolean;
  origin: string;
  destination: string;
  containerSize: '20 ft' | '40 ft';
  movementType: 'Import' | 'Export' | 'Rail';
  isLolo: boolean;
  yardSelection?: string;
  containerCount: number;
  remarks?: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id?: string;
  userId?: string;
  tripId?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  driverId?: string;
  driverName?: string;
  category: 'Fuel' | 'Toll' | 'Maintenance' | 'Driver Allowance' | 'Loading/Unloading' | 'Permit/Tax' | 'Weighment Charges' | 'Other';
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'online';
  status: 'pending' | 'paid';
  paymentRemark?: string;
  description?: string;
}

export interface LRSequence {
  id?: string;
  fiscalYear: string;
  lastNumber: number;
}

export interface LR {
  id?: string;
  lrNumber: string;
  shipmentId: string;
  orderId?: string;
  fiscalYear: string;
  sequenceNumber: number;
  createdAt: string;
}
