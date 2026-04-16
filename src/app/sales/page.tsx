// iiko-integration.ts - Yangi fayl yarating

// 1. API interfeyslari
interface IIikoOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface IIikoOrder {
  id: string;
  timestamp: string;
  warehouseId: string;
  warehouseName: string;
  items: IIikoOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentType: string;
  customerName?: string;
}

interface IIikoResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  receiptNumber?: string;
}

// 2. iiko-ga o'xshash servis
class IikoLikeService {
  private apiUrl: string;
  private apiKey: string;
  private isOfflineMode: boolean = true; // Offline rejimda mahalliy ishlaydi
  private pendingOrders: IIikoOrder[] = [];

  constructor() {
    // Sozlamalarni localStorage dan olish mumkin
    this.apiUrl = localStorage.getItem('iiko_api_url') || 'https://api.iiko.com/v1';
    this.apiKey = localStorage.getItem('iiko_api_key') || '';
  }

  // Sotuvni iiko-ga yuborish
  async sendOrder(order: IIikoOrder): Promise<IIikoResponse> {
    try {
      if (this.isOfflineMode) {
        // Offline rejimda mahalliy saqlaymiz
        this.saveToLocalQueue(order);
        return {
          success: true,
          orderId: `local_${order.id}`,
          receiptNumber: this.generateReceiptNumber()
        };
      }

      // Online rejimda API ga so'rov yuborish
      const response = await fetch(`${this.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          ...order,
          organizationId: localStorage.getItem('iiko_org_id')
        })
      });

      if (!response.ok) throw new Error('API so\'rovi muvaffaqiyatsiz');
      
      return await response.json();
    } catch (error) {
      console.error('iiko yuborishda xatolik:', error);
      // Xatolik bo'lsa, navbatga qo'shamiz
      this.saveToLocalQueue(order);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Noma\'lum xatolik'
      };
    }
  }

  // Navbatdagi orderlarni saqlash
  private saveToLocalQueue(order: IIikoOrder) {
    const queue = this.getQueue();
    queue.push({
      ...order,
      queuedAt: new Date().toISOString(),
      retryCount: 0
    });
    localStorage.setItem('iiko_pending_orders', JSON.stringify(queue));
  }

  private getQueue(): any[] {
    try {
      return JSON.parse(localStorage.getItem('iiko_pending_orders') || '[]');
    } catch {
      return [];
    }
  }

  // Navbatdagi orderlarni qayta yuborish
  async retryPendingOrders(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    for (const order of [...queue]) {
      const result = await this.sendOrder(order);
      if (result.success) {
        // Muvaffaqiyatli yuborilganlarni o'chiramiz
        const updatedQueue = this.getQueue().filter(o => o.id !== order.id);
        localStorage.setItem('iiko_pending_orders', JSON.stringify(updatedQueue));
      }
    }
  }

  private generateReceiptNumber(): string {
    const lastNum = parseInt(localStorage.getItem('last_receipt_num') || '0');
    const newNum = lastNum + 1;
    localStorage.setItem('last_receipt_num', newNum.toString());
    return `CH-${newNum.toString().padStart(6, '0')}`;
  }

  // Kundalik hisobotni yuborish
  async sendDailyReport(report: {
    date: string;
    totalSales: number;
    totalTransactions: number;
    topProducts: any[];
  }): Promise<void> {
    if (this.isOfflineMode) {
      localStorage.setItem(`daily_report_${report.date}`, JSON.stringify(report));
      return;
    }

    try {
      await fetch(`${this.apiUrl}/reports/daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.error('Hisobot yuborishda xatolik:', error);
    }
  }
}

// 3. POS komponentiga qo'shimcha qilish uchun hook
function useIikoIntegration() {
  const [iikoStatus, setIikoStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const iikoService = useMemo(() => new IikoLikeService(), []);

  const syncWithIiko = useCallback(async (transaction: Transaction) => {
    // Transaction ma'lumotlarini iiko formatiga o'tkazish
    const iikoOrder: IIikoOrder = {
      id: transaction.id,
      timestamp: transaction.date.toISOString(),
      warehouseId: transaction.warehouseId,
      warehouseName: transaction.warehouseName,
      items: transaction.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity
      })),
      subtotal: transaction.subtotal,
      discount: transaction.discount,
      total: transaction.total,
      paymentType: transaction.paymentType,
      customerName: transaction.customerName
    };

    const result = await iikoService.sendOrder(iikoOrder);
    
    if (result.success) {
      console.log(`✅ Order ${transaction.id} iiko-ga yuborildi`);
      // Chek raqamini saqlash
      if (result.receiptNumber) {
        localStorage.setItem(`receipt_${transaction.id}`, result.receiptNumber);
      }
    } else {
      console.warn(`⚠️ Order ${transaction.id} navbatga qo'shildi`);
    }

    return result;
  }, [iikoService]);

  // Navbatdagi orderlarni sinxronlash
  const syncPendingOrders = useCallback(async () => {
    setIikoStatus('syncing');
    await iikoService.retryPendingOrders();
    setIikoStatus('online');
  }, [iikoService]);

  // Kunlik hisobot yuborish
  const sendDailyReportToIiko = useCallback(async (transactions: Transaction[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => 
      t.date.toISOString().split('T')[0] === today
    );

    const report = {
      date: today,
      totalSales: todayTransactions.reduce((sum, t) => sum + t.total, 0),
      totalTransactions: todayTransactions.length,
      topProducts: getTopProducts(todayTransactions)
    };

    await iikoService.sendDailyReport(report);
  }, [iikoService]);

  return {
    iikoStatus,
    syncWithIiko,
    syncPendingOrders,
    sendDailyReportToIiko
  };
}

// 4. POSPage komponentiga qo'shimcha (page (13).tsx ichiga qo'shing)

// POSPage komponenti ichida:
const { iikoStatus, syncWithIiko, syncPendingOrders, sendDailyReportToIiko } = useIikoIntegration();

// handleSell funksiyasini o'zgartiring:
const handleSell = useCallback(async () => {
  // ... avvalgi kod ...
  
  // Sotuvdan so'ng iiko-ga yuborish
  const iikoResult = await syncWithIiko(tx);
  
  if (!iikoResult.success) {
    toast.warn(`iiko-ga ulanishda muammo: ${iikoResult.error || 'Navbatga qo\'shildi'}`);
  } else {
    toast.success(`Sotuv amalga oshdi! #${id} | Chek: ${iikoResult.receiptNumber || ''}`);
  }
  
  // ... davomi ...
}, [/* ... */]);

// 5. Sozlamalar paneli (iiko sozlamalari uchun)
function IikoSettingsModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('iiko_api_url') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('iiko_api_key') || '');
  const [orgId, setOrgId] = useState(localStorage.getItem('iiko_org_id') || '');
  const [mode, setMode] = useState<'online' | 'offline'>(() => 
    localStorage.getItem('iiko_mode') === 'online' ? 'online' : 'offline'
  );

  const save = () => {
    localStorage.setItem('iiko_api_url', apiUrl);
    localStorage.setItem('iiko_api_key', apiKey);
    localStorage.setItem('iiko_org_id', orgId);
    localStorage.setItem('iiko_mode', mode);
    onSave();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', padding: 24, width: 400 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>iiko Integratsiya Sozlamalari</h3>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>API URL</label>
          <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://api.iiko.com/v1" style={{ width: '100%' }} />
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="***" style={{ width: '100%' }} />
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tashkilot ID</label>
          <input value={orgId} onChange={e => setOrgId(e.target.value)} style={{ width: '100%' }} />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Ish rejimi</label>
          <select value={mode} onChange={e => setMode(e.target.value as 'online' | 'offline')} style={{ width: '100%' }}>
            <option value="offline">📴 Offline (mahalliy saqlash)</option>
            <option value="online">🌐 Online (iiko API ga ulanish)</option>
          </select>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            {mode === 'offline' ? 'Ma\'lumotlar mahalliy saqlanadi va keyin sinxronlanadi' : 'To\'g\'ridan-to\'g\'ri iiko API ga yuboriladi'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Bekor qilish</button>
          <button onClick={save} style={{ background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>Saqlash</button>
        </div>
      </div>
    </div>
  );
}
