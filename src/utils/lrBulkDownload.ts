import JSZip from 'jszip';
import type { Shipment, Order, Vehicle } from '../types';
import { buildLRDocument } from './reportGenerator';

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export async function downloadLRsAsZip(
  shipments: Shipment[],
  orders: Order[],
  vehicles: Vehicle[],
): Promise<{ success: number; failed: number }> {
  if (shipments.length === 0) return { success: 0, failed: 0 };

  // JSZip supports being called without `new` (internally returns `new JSZip()` if needed).
  // Using function-call form keeps tests compatible with vi.fn() arrow-function mocks.
  const zip = (JSZip as unknown as () => InstanceType<typeof JSZip>)();
  let success = 0;
  let failed = 0;

  for (const shipment of shipments) {
    try {
      const order = orders.find((o) => o.id === shipment.orderId);
      const vehicle = vehicles.find(
        (v) => v.id === shipment.vehicleId || v.plateNumber === shipment.vehicleNumber,
      );
      const doc = buildLRDocument(shipment, order, vehicle);
      const buffer = doc.output('arraybuffer');
      const fileName = `LR_${shipment.tripId}_${shipment.containerNumber}.pdf`;
      zip.file(fileName, buffer);
      success++;
    } catch {
      failed++;
    }
  }

  const orderIds = new Set(shipments.map((s) => s.orderId));
  let zipName: string;
  if (orderIds.size === 1) {
    const orderId = orderIds.values().next().value;
    const order = orders.find((o) => o.id === orderId);
    zipName = `LRs_${order?.orderNumber ?? orderId ?? 'Order'}.zip`;
  } else {
    zipName = `LRs_All.zip`;
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveBlob(blob, zipName);

  return { success, failed };
}
