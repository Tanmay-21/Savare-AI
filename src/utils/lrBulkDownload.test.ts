import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Shipment, Order, Vehicle } from '../types';

// Mock jsPDF so no DOM/canvas is needed
vi.mock('jspdf', () => {
  const save = vi.fn();
  const output = vi.fn(() => new ArrayBuffer(8));
  const MockJsPDF = vi.fn(() => ({
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    save,
    output,
    internal: { pageSize: { getWidth: () => 210 } },
  }));
  return { default: MockJsPDF };
});
vi.mock('jspdf-autotable', () => ({}));

// Mock JSZip
const mockFile = vi.fn();
const mockGenerateAsync = vi.fn().mockResolvedValue(new Blob(['zip']));
vi.mock('jszip', () => ({
  default: vi.fn(() => ({ file: mockFile, generateAsync: mockGenerateAsync })),
}));

// Mock saveAs helper (the module-private one is reimplemented in lrBulkDownload)
const mockCreateObjectURL = vi.fn(() => 'blob:mock');
const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: 's1',
    tripId: 'T-001',
    containerNumber: 'CONT001',
    origin: 'Mumbai',
    destination: 'Pune',
    status: 'delivered',
    orderId: 'o1',
    lrNumber: 'LR-001/24-25',
    billingPartyName: 'ACME Corp',
  },
  {
    id: 's2',
    tripId: 'T-002',
    containerNumber: 'CONT002',
    origin: 'Mumbai',
    destination: 'Pune',
    status: 'delivered',
    orderId: 'o1',
    lrNumber: 'LR-002/24-25',
    billingPartyName: 'ACME Corp',
  },
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'o1',
    orderNumber: 'ORD-001',
    billingPartyName: 'ACME Corp',
    isBillingSameAsConsignee: true,
    origin: 'Mumbai',
    destination: 'Pune',
    containerSize: '20 ft',
    movementType: 'Import',
    isLolo: false,
    containerCount: 2,
    status: 'in-progress',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v1', plateNumber: 'MH01AB1234', vehicleType: 'Truck', status: 'active' },
];

describe('downloadLRsAsZip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = vi.fn();
    const anchor = { href: '', download: '', click: mockClick, style: { display: '' } } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
  });

  it('calls buildLRDocument for each shipment and adds to zip', async () => {
    const { downloadLRsAsZip } = await import('./lrBulkDownload');
    await downloadLRsAsZip(MOCK_SHIPMENTS, MOCK_ORDERS, MOCK_VEHICLES);
    expect(mockFile).toHaveBeenCalledTimes(2);
  });

  it('names each PDF file using tripId and containerNumber', async () => {
    const { downloadLRsAsZip } = await import('./lrBulkDownload');
    await downloadLRsAsZip(MOCK_SHIPMENTS, MOCK_ORDERS, MOCK_VEHICLES);
    const fileNames: string[] = mockFile.mock.calls.map((c) => c[0] as string);
    expect(fileNames[0]).toContain('T-001');
    expect(fileNames[0]).toContain('CONT001');
    expect(fileNames[1]).toContain('T-002');
    expect(fileNames[1]).toContain('CONT002');
  });

  it('names the ZIP after the order number when all shipments share one order', async () => {
    const { downloadLRsAsZip } = await import('./lrBulkDownload');
    await downloadLRsAsZip(MOCK_SHIPMENTS, MOCK_ORDERS, MOCK_VEHICLES);
    const downloadAttr: string = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0]?.value?.download ?? '';
    expect(downloadAttr).toContain('ORD-001');
  });

  it('names the ZIP "LRs_All" when shipments span multiple orders', async () => {
    const multiOrder = [
      ...MOCK_SHIPMENTS,
      { ...MOCK_SHIPMENTS[0], id: 's3', orderId: 'o2', tripId: 'T-003', lrNumber: 'LR-003/24-25' },
    ];
    const { downloadLRsAsZip } = await import('./lrBulkDownload');
    await downloadLRsAsZip(multiOrder, MOCK_ORDERS, MOCK_VEHICLES);
    const downloadAttr: string = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0]?.value?.download ?? '';
    expect(downloadAttr).toContain('All');
  });

  it('does nothing when shipments array is empty', async () => {
    const { downloadLRsAsZip } = await import('./lrBulkDownload');
    await downloadLRsAsZip([], MOCK_ORDERS, MOCK_VEHICLES);
    expect(mockFile).not.toHaveBeenCalled();
    expect(mockGenerateAsync).not.toHaveBeenCalled();
  });

  it('returns count of successful and failed downloads', async () => {
    const { downloadLRsAsZip } = await import('./lrBulkDownload');
    const result = await downloadLRsAsZip(MOCK_SHIPMENTS, MOCK_ORDERS, MOCK_VEHICLES);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('skips failed PDFs and counts them in failed', async () => {
    const jsPDF = (await import('jspdf')).default as unknown as ReturnType<typeof vi.fn>;
    let callCount = 0;
    jsPDF.mockImplementation(() => {
      callCount++;
      if (callCount === 2) throw new Error('PDF build error');
      return {
        setFontSize: vi.fn(), setFont: vi.fn(), text: vi.fn(), save: vi.fn(),
        output: vi.fn(() => new ArrayBuffer(8)),
        internal: { pageSize: { getWidth: () => 210 } },
      };
    });

    const { downloadLRsAsZip } = await import('./lrBulkDownload');
    const result = await downloadLRsAsZip(MOCK_SHIPMENTS, MOCK_ORDERS, MOCK_VEHICLES);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
  });
});
