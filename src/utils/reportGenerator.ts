import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Expense, Shipment, Order, Driver, Vehicle } from '../types';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const saveAs = (blob: Blob, fileName: string) => {
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
};

export const downloadExpenseReport = async (expenses: Expense[], trips: Shipment[], format: 'excel' | 'csv' = 'excel') => {
  const getTrip = (tripId?: string) => {
    return trips.find(t => t.id === tripId || t.tripId === tripId);
  };

  if (format === 'excel' || format === 'csv') {
    const workbook = new ExcelJS.Workbook();
    
    const addSheet = (name: string, data: Expense[]) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = [
        { header: 'Sr. No.', key: 'srNo', width: 8 },
        { header: 'Vehicle No.', key: 'vehicleNo', width: 15 },
        { header: 'Container No.', key: 'containerNo', width: 20 },
        { header: 'Origin', key: 'origin', width: 20 },
        { header: 'Destination', key: 'destination', width: 20 },
        { header: 'Billing Party Name', key: 'billingParty', width: 25 },
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Trip ID', key: 'tripId', width: 20 },
        { header: 'Expense Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Status', key: 'status', width: 10 }
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF013068' }
      };

      data.forEach((e, index) => {
        const trip = getTrip(e.tripId);
        sheet.addRow({
          srNo: index + 1,
          vehicleNo: e.vehicleNumber || trip?.vehicleNumber || 'N/A',
          containerNo: trip?.containerNumber || 'N/A',
          origin: trip?.origin || 'N/A',
          destination: trip?.destination || 'N/A',
          billingParty: trip?.billingPartyName || 'N/A',
          orderId: trip?.orderId || 'N/A',
          tripId: trip?.tripId || 'N/A',
          amount: e.amount,
          category: e.category,
          date: new Date(e.date).toLocaleDateString(),
          status: e.status
        });
      });
    };

    const cashExpenses = expenses.filter(e => e.paymentMethod === 'cash');
    const onlineExpenses = expenses.filter(e => e.paymentMethod === 'online');

    addSheet('Cash Expenses', cashExpenses);
    addSheet('Online Expenses', onlineExpenses);

    if (format === 'excel') {
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Expense_Report_${new Date().getTime()}.xlsx`);
    } else {
      const buffer = await workbook.csv.writeBuffer();
      saveAs(new Blob([buffer]), `Expense_Report_${new Date().getTime()}.csv`);
    }
  }
};

export const downloadDailyReport = async (shipments: Shipment[], orders: Order[], expenses: Expense[], format: 'excel' | 'csv' = 'excel') => {
  const workbook = new ExcelJS.Workbook();
  
  const createSheet = (name: string, size: '20 ft' | '40 ft') => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: 'Sr. No.', key: 'srNo', width: 8 },
      { header: 'Vehicle No.', key: 'vehicleNo', width: 15 },
      { header: 'Container No.', key: 'containerNo', width: 20 },
      { header: 'Origin', key: 'origin', width: 20 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Consignee Name', key: 'consignee', width: 25 },
      { header: 'Billing Party Name', key: 'billingParty', width: 25 },
      { header: 'Order No.', key: 'orderNo', width: 20 },
      { header: 'Export/Import', key: 'movementType', width: 15 },
      { header: 'LOLO', key: 'lolo', width: 10 },
      { header: 'Yard Name', key: 'yardName', width: 20 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF013068' }
    };

    const filteredShipments = shipments.filter(s => s.containerSize === size);
    
    filteredShipments.forEach((s, index) => {
      const order = orders.find(o => o.id === s.orderId);
      
      sheet.addRow({
        srNo: index + 1,
        vehicleNo: s.vehicleNumber || 'N/A',
        containerNo: s.containerNumber || 'N/A',
        origin: s.origin,
        destination: s.destination,
        consignee: s.consigneeName || order?.consigneeName || 'N/A',
        billingParty: s.billingPartyName || order?.billingPartyName || 'N/A',
        orderNo: order?.orderNumber || 'N/A',
        movementType: s.movementType || order?.movementType || 'N/A',
        lolo: s.isLolo ? 'Yes' : '',
        yardName: s.isLolo ? (s.yardSelection || '') : ''
      });
    });
  };

  createSheet('40ft Movement', '40 ft');
  createSheet('20ft Movement', '20 ft');

  if (format === 'excel') {
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Daily_Report_${new Date().getTime()}.xlsx`);
  } else {
    const buffer = await workbook.csv.writeBuffer();
    saveAs(new Blob([buffer]), `Daily_Report_${new Date().getTime()}.csv`);
  }
};

export const downloadAnnexureReport = async (shipments: Shipment[], orders: Order[], format: 'excel' | 'pdf' = 'excel') => {
  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Annexure');
    
    sheet.columns = [
      { header: 'Sr. No.', key: 'srNo', width: 8 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Vehicle No.', key: 'vehicleNo', width: 15 },
      { header: 'Container No.', key: 'containerNo', width: 20 },
      { header: 'Origin', key: 'origin', width: 20 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Billing Party Name', key: 'billingParty', width: 25 },
      { header: 'Consignee', key: 'consignee', width: 25 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF013068' }
    };

    shipments.forEach((s, index) => {
      const order = orders.find(o => o.id === s.orderId);
      sheet.addRow({
        srNo: index + 1,
        date: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A',
        vehicleNo: s.vehicleNumber || 'N/A',
        containerNo: s.containerNumber || 'N/A',
        origin: s.origin,
        destination: s.destination,
        billingParty: s.billingPartyName || order?.billingPartyName || 'N/A',
        consignee: s.consigneeName || order?.consigneeName || 'N/A'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Annexure_${new Date().getTime()}.xlsx`);
  } else {
    const doc = new jsPDF();
    doc.text('Annexure Report', 14, 15);

    const columns = [
      { header: 'Sr. No.', dataKey: 'srNo' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Vehicle No.', dataKey: 'vehicleNo' },
      { header: 'Container No.', dataKey: 'containerNo' },
      { header: 'Origin', dataKey: 'origin' },
      { header: 'Destination', dataKey: 'destination' },
      { header: 'Billing Party', dataKey: 'billingParty' },
      { header: 'Consignee', dataKey: 'consignee' }
    ];

    const body = shipments.map((s, index) => {
      const order = orders.find(o => o.id === s.orderId);
      return {
        srNo: index + 1,
        date: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A',
        vehicleNo: s.vehicleNumber || 'N/A',
        containerNo: s.containerNumber || 'N/A',
        origin: s.origin,
        destination: s.destination,
        billingParty: s.billingPartyName || order?.billingPartyName || 'N/A',
        consignee: s.consigneeName || order?.consigneeName || 'N/A'
      };
    });

    doc.autoTable({
      startY: 20,
      columns,
      body,
    });

    doc.save(`Annexure_${new Date().getTime()}.pdf`);
  }
};

export const downloadVehiclePerformanceReport = async (shipments: Shipment[], vehicles: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Vehicle Performance');
  
  sheet.columns = [
    { header: 'Sr. No.', key: 'srNo', width: 8 },
    { header: 'Vehicle No.', key: 'vehicleNo', width: 15 },
    { header: 'Trip Count', key: 'tripCount', width: 15 },
    { header: 'Days on Hold / Idle Days', key: 'idleDays', width: 25 }
  ];

  sheet.getRow(1).font = { bold: true };

  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  vehicles.forEach((v, index) => {
    const vehicleTrips = shipments.filter(s => s.vehicleId === v.id || s.vehicleNumber === v.plateNumber);
    const tripCount = vehicleTrips.filter(s => s.status === 'in-transit' || s.status === 'delivered').length;
    
    let daysInTransit = 0;
    vehicleTrips.forEach(s => {
      if (s.status === 'delivered' && s.createdAt && s.actualArrival) {
        const start = new Date(s.createdAt);
        const end = new Date(s.actualArrival);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          daysInTransit += (diffDays - 1);
        }
      } else if (s.status === 'in-transit' && s.createdAt) {
        const start = new Date(s.createdAt);
        const end = new Date();
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          daysInTransit += (diffDays - 1);
        }
      }
    });

    const idleDays = Math.max(0, totalDaysInMonth - daysInTransit);

    sheet.addRow({
      srNo: index + 1,
      vehicleNo: v.plateNumber,
      tripCount,
      idleDays
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Vehicle_Performance_${new Date().getTime()}.xlsx`);
};

export const downloadPayoutReport = async (expenses: Expense[], drivers: Driver[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Vehicle Payouts');

  sheet.columns = [
    { header: 'Sr. No.', key: 'srNo', width: 8 },
    { header: 'Vehicle No.', key: 'vehicleNo', width: 15 },
    { header: 'Driver Name', key: 'driverName', width: 20 },
    { header: 'Bank Account', key: 'bankAccount', width: 20 },
    { header: 'IFSC', key: 'ifsc', width: 15 },
    { header: 'UPI ID', key: 'upiId', width: 20 },
    { header: 'Total Payout (₹)', key: 'totalAmount', width: 15 },
    { header: 'Expense Count', key: 'count', width: 15 }
  ];

  sheet.getRow(1).font = { bold: true };

  // Group by vehicleNumber
  const grouped = expenses.reduce((acc, curr) => {
    const key = curr.vehicleNumber || 'Unknown';
    if (!acc[key]) {
      acc[key] = {
        vehicleNo: key,
        totalAmount: 0,
        count: 0,
        driverId: curr.driverId,
        driverName: curr.driverName
      };
    }
    acc[key].totalAmount += curr.amount;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);

  Object.values(grouped).forEach((data, index) => {
    const driver = drivers.find(d => d.id === data.driverId || d.name === data.driverName);
    sheet.addRow({
      srNo: index + 1,
      vehicleNo: data.vehicleNo,
      driverName: driver?.name || data.driverName || 'N/A',
      bankAccount: driver?.bankAccount || 'N/A',
      ifsc: driver?.ifsc || 'N/A',
      upiId: driver?.upiId || 'N/A',
      totalAmount: data.totalAmount,
      count: data.count
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Payout_Report_${new Date().getTime()}.xlsx`);
};

/** Builds a jsPDF LR document in memory and returns it. Does NOT save or download. */
export const buildLRDocument = (shipment: Shipment, order?: Order, vehicle?: Vehicle): jsPDF => {
  // jsPDF supports being called as a function (returns new instance if not called with new).
  // Function-call form keeps vi.fn() arrow-function mocks in tests working correctly.
  const doc = (jsPDF as unknown as () => jsPDF)();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`LR No: ${shipment.lrNumber || 'N/A'}`, pageWidth - margin, margin, { align: 'right' });

  doc.setFontSize(18);
  doc.text('Lorry Receipt', margin, margin + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  let y = margin + 30;
  const lineHeight = 10;

  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, y);
    y += lineHeight;
  };

  addField('Consignor', shipment.billingPartyName || order?.billingPartyName || 'N/A');
  addField('Consignee', shipment.consigneeName || order?.consigneeName || 'N/A');
  addField('Vehicle Number', shipment.vehicleNumber || 'N/A');
  addField('Origin', shipment.origin || order?.origin || 'N/A');
  addField('Destination', shipment.destination || order?.destination || 'N/A');

  const containerSize = vehicle?.vehicleType || shipment.containerSize || 'N/A';
  addField('Container Size', containerSize);

  addField('Container Number', shipment.containerNumber || 'N/A');

  return doc;
};

export const downloadLR = async (shipment: Shipment, order?: Order, vehicle?: Vehicle) => {
  const doc = buildLRDocument(shipment, order, vehicle);
  doc.save(`LR_${shipment.tripId}_${new Date().getTime()}.pdf`);
};
