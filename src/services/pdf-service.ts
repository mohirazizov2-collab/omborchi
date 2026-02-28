
'use client';

/**
 * Professional PDF Invoice Generator Service
 * Handles unified design for StockIn and StockOut documents.
 */

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface InvoiceData {
  title: string;
  type: 'in' | 'out';
  docNumber: string;
  date: string;
  partyName: string; // Supplier or Recipient
  partyTypeLabel: string; // "Yetkazib beruvchi" or "Mijoz"
  warehouseName: string;
  responsibleName: string;
  items: InvoiceItem[];
  currency: string;
  labels: {
    number: string;
    date: string;
    warehouse: string;
    product: string;
    qty: string;
    unit: string;
    price: string;
    total: string;
    grandTotal: string;
    shippedBy: string;
    receivedBy: string;
  };
}

export async function generateInvoicePDF(data: InvoiceData) {
  try {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    
    // @ts-ignore
    await import("jspdf-autotable");
    
    const doc = new jsPDF();
    const themeColor = data.type === 'in' ? [59, 130, 246] : [225, 29, 72]; // Blue vs Rose

    // --- 1. Brand Header ---
    doc.setFontSize(24);
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(data.title.toUpperCase(), 105, 20, { align: "center" });

    doc.setDrawColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    // --- 2. Information Grid ---
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.setFont("helvetica", "normal");

    // Left Column
    doc.text(`${data.partyTypeLabel}:`, 20, 40);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(data.partyName, 60, 40);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`${data.labels.warehouse}:`, 20, 47);
    doc.setTextColor(0);
    doc.text(data.warehouseName, 60, 47);

    // Right Column
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`${data.labels.number}:`, 130, 40);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(data.docNumber, 160, 40);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`${data.labels.date}:`, 130, 47);
    doc.setTextColor(0);
    doc.text(data.date, 160, 47);

    // --- 3. Items Table ---
    const tableRows = data.items.map((it, i) => [
      i + 1,
      it.name,
      it.quantity,
      it.unit,
      it.price.toLocaleString().replace(/,/g, ' '),
      (it.quantity * it.price).toLocaleString().replace(/,/g, ' ')
    ]);

    (doc as any).autoTable({
      startY: 60,
      head: [[
        '#',
        data.labels.product,
        data.labels.qty,
        data.labels.unit,
        `${data.labels.price} (${data.currency})`,
        `${data.labels.total} (${data.currency})`
      ]],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: themeColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: { 
        fontSize: 9, 
        font: "helvetica", 
        cellPadding: 4 
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    // --- 4. Grand Total ---
    const total = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.grandTotal.toUpperCase()}:`, 120, finalY);
    doc.text(`${total.toLocaleString().replace(/,/g, ' ')} ${data.currency}`, 190, finalY, { align: 'right' });

    // --- 5. Signatures ---
    const signY = finalY + 35;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");

    // Layout signatures
    doc.text(`${data.labels.shippedBy}:`, 20, signY);
    doc.line(20, signY + 5, 80, signY + 5);
    if (data.type === 'out') doc.text(data.responsibleName, 20, signY + 10);

    doc.text(`${data.labels.receivedBy}:`, 130, signY);
    doc.line(130, signY + 5, 190, signY + 5);
    if (data.type === 'in') doc.text(data.responsibleName, 130, signY + 10);
    else doc.text(data.partyName, 130, signY + 10);

    // --- 6. Footer ---
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text("omborchi.uz - Professional Warehouse Management System", 105, 285, { align: "center" });

    doc.save(`${data.title}_${data.docNumber}.pdf`);
  } catch (error) {
    console.error("PDF Generation failed:", error);
    throw error;
  }
}
