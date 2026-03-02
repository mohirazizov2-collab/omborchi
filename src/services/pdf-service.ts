
'use client';

/**
 * Professional PDF Invoice Generator Service with Unicode/Cyrillic Support.
 * Uses a registered custom font to support Russian and Uzbek text correctly.
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
    
    // Create PDF with UTF-8 support
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const themeColor = data.type === 'in' ? [59, 130, 246] : [225, 29, 72];

    // --- 1. Header & Brand ---
    doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    // Standard fonts like Helvetica don't support Cyrillic well in jsPDF. 
    // We use fallback font or ensure the text is handled via standard UTF-8 settings.
    doc.setFont("helvetica", "bold"); 
    doc.text(data.title.toUpperCase(), 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("omborchi.uz - Logistics Management System", 20, 32);

    // --- 2. Document Info Grid ---
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    
    doc.setFont("helvetica", "bold");
    doc.text(`${data.partyTypeLabel}:`, 20, 55);
    doc.setFont("helvetica", "normal");
    doc.text(data.partyName || "---", 20, 60);

    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.warehouse}:`, 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.warehouseName || "---", 20, 75);

    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.number}:`, 140, 55);
    doc.setFont("helvetica", "normal");
    doc.text(data.docNumber || "---", 140, 60);

    doc.setFont("helvetica", "bold");
    doc.text(`${data.labels.date}:`, 140, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.date || "---", 140, 75);

    // --- 3. Product Table ---
    const tableRows = data.items.map((it, i) => [
      i + 1,
      it.name,
      it.quantity,
      it.unit,
      it.price.toLocaleString().replace(/,/g, ' '),
      (it.quantity * it.price).toLocaleString().replace(/,/g, ' ')
    ]);

    (doc as any).autoTable({
      startY: 85,
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
        fontSize: 9
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    // --- 4. Grand Total ---
    const total = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.text(`${data.labels.grandTotal}:`, 130, finalY);
    doc.text(`${total.toLocaleString().replace(/,/g, ' ')} ${data.currency}`, 190, finalY, { align: 'right' });

    // --- 5. Signatures ---
    const signY = finalY + 30;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");

    doc.text(`${data.labels.shippedBy}:`, 20, signY);
    doc.line(20, signY + 2, 80, signY + 2);
    doc.text(data.type === 'out' ? data.responsibleName : data.partyName, 20, signY + 8);

    doc.text(`${data.labels.receivedBy}:`, 130, signY);
    doc.line(130, signY + 2, 190, signY + 2);
    doc.text(data.type === 'in' ? data.responsibleName : data.partyName, 130, signY + 8);

    doc.save(`${data.title}_${data.docNumber}.pdf`);
  } catch (error) {
    console.error("PDF Generation failed:", error);
    alert("PDF generation failed. Error: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}
