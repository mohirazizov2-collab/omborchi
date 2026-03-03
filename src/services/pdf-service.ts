
'use client';

/**
 * Professional Multilingual PDF Invoice Generator Service.
 * Optimized for O'zbek, Russian, and English.
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
  partyName: string; 
  partyTypeLabel: string; 
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
    
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    // Theme color based on operation type
    const themeColor = data.type === 'in' ? [59, 130, 246] : [225, 29, 72];

    // --- 1. Header Design ---
    doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold"); 
    doc.text(data.title.toUpperCase(), 15, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("omborchi.uz | Professional Inventory Management System", 15, 32);

    // --- 2. Info Section (Grid Layout) ---
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    
    // Left Column
    doc.setFont("helvetica", "bold");
    doc.text(`${data.partyTypeLabel}:`, 15, 55);
    doc.setFont("helvetica", "normal");
    doc.text(data.partyName || "N/A", 15, 61);

    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.warehouse}:`, 15, 72);
    doc.setFont("helvetica", "normal");
    doc.text(data.warehouseName || "N/A", 15, 78);
    
    // Right Column
    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.number}:`, 130, 55);
    doc.setFont("helvetica", "normal");
    doc.text(data.docNumber || "---", 130, 61);

    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.date}:`, 130, 72);
    doc.setFont("helvetica", "normal");
    doc.text(data.date || "---", 130, 78);

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
      startY: 90,
      head: [[
        '#',
        data.labels.product,
        data.labels.qty,
        data.labels.unit,
        data.labels.price,
        data.labels.total
      ]],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: themeColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        font: 'helvetica'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 35 },
        5: { halign: 'right', cellWidth: 40 }
      }
    });

    // --- 4. Totals ---
    const totalValue = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.text(`${data.labels.grandTotal}: ${totalValue.toLocaleString().replace(/,/g, ' ')} ${data.currency}`, 195, finalY, { align: 'right' });

    // --- 5. Signatures ---
    const signY = 250;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    
    // Shipped By
    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.shippedBy}:`, 15, signY);
    doc.line(15, signY + 2, 85, signY + 2);
    doc.setFont("helvetica", "normal");
    doc.text(data.type === 'out' ? data.responsibleName : data.partyName, 15, signY + 10);

    // Received By
    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.receivedBy}:`, 125, signY);
    doc.line(125, signY + 2, 195, signY + 2);
    doc.setFont("helvetica", "normal");
    doc.text(data.type === 'in' ? data.responsibleName : data.partyName, 125, signY + 10);

    // Footer note
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated automatically by omborchi.uz System at ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

    doc.save(`${data.title}_${data.docNumber}.pdf`);
  } catch (error) {
    console.error("Professional PDF Generation failed:", error);
  }
}
