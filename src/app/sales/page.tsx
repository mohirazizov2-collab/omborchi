'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';

interface Sale {
  id: string;
  date: string;
  warehouseName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentType: string;
  customerName?: string;
  customerPhone?: string;
}

interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  productPrice: number;
  total: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    warehouseId: '',
    startDate: '',
    endDate: ''
  });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageSale: 0
  });

  // Sotuvlarni yuklash
  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.warehouseId) params.append('warehouseId', filter.warehouseId);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      
      const response = await fetch(`/api/sales?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setSales(result.data);
        
        // Statistikani hisoblash
        const totalRevenue = result.data.reduce((sum: number, sale: Sale) => sum + sale.total, 0);
        setStats({
          totalSales: result.data.length,
          totalRevenue,
          averageSale: result.data.length > 0 ? totalRevenue / result.data.length : 0
        });
      }
    } catch (error) {
      console.error('Xatolik:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Format number
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(Math.round(amount));
  };

  // Format date
  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: uz });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 Sotuvlar hisoboti</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Jami sotuvlar</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalSales} ta</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Jami daromad</div>
            <div className="text-2xl font-bold text-green-600">{formatMoney(stats.totalRevenue)} so'm</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">O'rtacha chek</div>
            <div className="text-2xl font-bold text-purple-600">{formatMoney(stats.averageSale)} so'm</div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({...filter, startDate: e.target.value})}
              className="border rounded-lg px-3 py-2"
              placeholder="Boshlanish sanasi"
            />
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({...filter, endDate: e.target.value})}
              className="border rounded-lg px-3 py-2"
              placeholder="Tugash sanasi"
            />
            <button
              onClick={loadSales}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              🔍 Qidirish
            </button>
            <button
              onClick={() => setFilter({ warehouseId: '', startDate: '', endDate: '' })}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              🔄 Tozalash
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Yuklanmoqda...</div>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">📭 Hech qanday sotuv topilmadi</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chek №</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sana</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ombor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mahsulotlar</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Summa</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">To'lov</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Amallar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{sale.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sale.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.warehouseName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          {sale.items.slice(0, 2).map(item => (
                            <div key={item.id} className="truncate">
                              {item.productName} x{item.quantity}
                            </div>
                          ))}
                          {sale.items.length > 2 && (
                            <div className="text-xs text-gray-400">+{sale.items.length - 2} ta</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-green-600">
                        {formatMoney(sale.total)} so'm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          sale.paymentType === 'cash' 
                            ? 'bg-green-100 text-green-800' 
                            : sale.paymentType === 'card'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {sale.paymentType === 'cash' ? '💵 Naqd' : sale.paymentType === 'card' ? '💳 Karta' : '🔀 Aralash'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          👁️ Ko'rish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">🧾 Chek #{selectedSale.id.slice(-6).toUpperCase()}</h2>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="border-t border-b py-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sana:</span>
                  <span>{formatDate(selectedSale.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ombor:</span>
                  <span>{selectedSale.warehouseName}</span>
                </div>
                {selectedSale.customerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mijoz:</span>
                    <span>{selectedSale.customerName}</span>
                  </div>
                )}
              </div>
              
              <table className="min-w-full mb-4">
                <thead>
                  <tr className="text-gray-500 text-sm">
                    <th className="text-left pb-2">Mahsulot</th>
                    <th className="text-center pb-2">Soni</th>
                    <th className="text-right pb-2">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{formatMoney(item.total)} so'm</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t pt-4">
                  <tr>
                    <td colSpan={2} className="text-right font-semibold py-2">Jami:</td>
                    <td className="text-right font-bold text-green-600">{formatMoney(selectedSale.total)} so'm</td>
                  </tr>
                </tfoot>
              </table>
              
              <div className="text-center text-gray-400 text-sm pt-4">
                Rahmat! Yana keling! 🙏
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
