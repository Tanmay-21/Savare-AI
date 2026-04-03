export const EXPENSE_CATEGORIES = [
  'Fuel',
  'Toll',
  'Maintenance',
  'Driver Allowance',
  'Loading/Unloading',
  'Permit/Tax',
  'Weighment Charges',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
