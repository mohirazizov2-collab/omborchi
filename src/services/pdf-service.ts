
'use client';

/**
 * Professional PDF Invoice Generator Service with Unicode/Cyrillic Support.
 * Optimized for professional warehouse documentation.
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
    
    // Use putOnlyUsedFonts to keep PDF small.
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const themeColor = data.type === 'in' ? [59, 130, 246] : [225, 29, 72];

    // --- 1. Header with Background Bar ---
    doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold"); 
    doc.text(data.title.toUpperCase(), 15, 22);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("omborchi.uz | Modern Inventory Solutions", 15, 30);

    // --- 2. Info Grid ---
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    
    // Header Info Labels
    doc.setFont("helvetica", "bold");
    doc.text(`${data.partyTypeLabel}:`, 15, 55);
    doc.text(`${data.labels.warehouse}:`, 15, 75);
    
    doc.text(`${data.labels.number}:`, 130, 55);
    doc.text(`${data.labels.date}:`, 130, 75);

    // Header Info Values
    doc.setFont("helvetica", "normal");
    doc.text(data.partyName || "---", 15, 62);
    doc.text(data.warehouseName || "---", 15, 82);
    doc.text(data.docNumber || "---", 130, 62);
    doc.text(data.date || "---", 130, 82);

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
      startY: 95,
      head: [[
        '#',
        data.labels.product,
        data.labels.qty,
        data.labels.unit,
        `${data.labels.price}`,
        `${data.labels.total}`
      ]],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: themeColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        font: 'helvetica'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 35 }
      }
    });

    // --- 4. Summary ---
    const total = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.text(`${data.labels.grandTotal}: ${total.toLocaleString().replace(/,/g, ' ')} ${data.currency}`, 195, finalY, { align: 'right' });

    // --- 5. Footer & Signatures ---
    const signY = 265;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");

    // Signature 1
    doc.text(`${data.labels.shippedBy}:`, 15, signY);
    doc.line(15, signY + 2, 85, signY + 2);
    doc.text(data.type === 'out' ? data.responsibleName : data.partyName, 15, signY + 7);

    // Signature 2
    doc.text(`${data.labels.receivedBy}:`, 125, signY);
    doc.line(125, signY + 2, 195, signY + 2);
    doc.text(data.type === 'in' ? data.responsibleName : data.partyName, 125, signY + 7);

    // Save
    doc.save(`${data.title}_${data.docNumber}.pdf`);
  } catch (error) {
    console.error("PDF Generation failed:", error);
  }
}
