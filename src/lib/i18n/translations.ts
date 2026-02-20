
export type Language = 'uz' | 'ru' | 'en';

export const translations = {
  uz: {
    nav: {
      dashboard: 'Dashboard',
      warehouses: 'Omborlar',
      products: 'Mahsulotlar',
      stockIn: 'Kirib kelish',
      stockOut: 'Chiqib ketish',
      transfers: 'Transferlar',
      reports: 'Hisobotlar',
      systemGen: 'Tizim Gen',
      userManagement: 'Foydalanuvchilar',
      settings: 'Sozlamalar',
      menu: 'Menyu',
      administration: 'Administratsiya'
    },
    dashboard: {
      title: 'Boshqaruv paneli',
      description: 'OmniStock inventar va ombor operatsiyalari umumiy ko\'rinishi.',
      totalStockValue: 'Jami zaxira qiymati',
      activeWarehouses: 'Faol omborlar',
      monthlyStockIn: 'Oylik kirish',
      monthlyStockOut: 'Oylik chiqish',
      stockMovements: 'Zaxira harakati',
      lowStockAlerts: 'Kam qolgan mahsulotlar',
      recentMovements: 'Oxirgi harakatlar',
      viewAll: 'Hammasini ko\'rish'
    },
    warehouses: {
      title: 'Omborxonalar',
      description: 'Barcha saqlash joylarini boshqarish va monitoring qilish.',
      addNew: 'Yangi ombor qo\'shish',
      search: 'Omborlarni qidirish...',
      manager: 'Menejer',
      contact: 'Aloqa',
      utilization: 'Zaxira hajmi'
    },
    products: {
      title: 'Mahsulotlar katalogi',
      description: 'Inventar buyumlari, SKU va zaxira darajalarini boshqaring.',
      addNew: 'Yangi mahsulot',
      search: 'Nomi, SKU yoki kategoriya bo\'yicha qidirish...',
      productInfo: 'Mahsulot ma\'lumoti',
      category: 'Kategoriya',
      sku: 'SKU',
      stock: 'Zaxira',
      price: 'Narx',
      status: 'Holat'
    },
    actions: {
      downloadReport: 'Hisobotni yuklash',
      newOperation: 'Yangi operatsiya',
      filter: 'Filtrlash',
      process: 'Jarayonni boshlash',
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      edit: 'Tahrirlash',
      delete: 'O\'chirish'
    },
    common: {
      quantity: 'Miqdor',
      warehouse: 'Ombor',
      date: 'Sana',
      product: 'Mahsulot',
      type: 'Turi',
      id: 'ID'
    }
  },
  ru: {
    nav: {
      dashboard: 'Дашборд',
      warehouses: 'Склады',
      products: 'Товары',
      stockIn: 'Приход',
      stockOut: 'Расход',
      transfers: 'Переводы',
      reports: 'Отчеты',
      systemGen: 'Ген Системы',
      userManagement: 'Пользователи',
      settings: 'Настройки',
      menu: 'Меню',
      administration: 'Администрирование'
    },
    dashboard: {
      title: 'Панель управления',
      description: 'Обзор инвентаря и складских операций OmniStock.',
      totalStockValue: 'Общая стоимость запасов',
      activeWarehouses: 'Активные склады',
      monthlyStockIn: 'Месячный приход',
      monthlyStockOut: 'Месячный расход',
      stockMovements: 'Движение запасов',
      lowStockAlerts: 'Низкий уровень запасов',
      recentMovements: 'Последние движения',
      viewAll: 'Посмотреть все'
    },
    warehouses: {
      title: 'Склады',
      description: 'Управление и мониторинг всех складских помещений.',
      addNew: 'Добавить склад',
      search: 'Поиск складов...',
      manager: 'Менеджер',
      contact: 'Контакт',
      utilization: 'Использование склада'
    },
    products: {
      title: 'Каталог товаров',
      description: 'Управляйте товарами, SKU и уровнями запасов.',
      addNew: 'Новый товар',
      search: 'Поиск по названию, SKU или категории...',
      productInfo: 'Инфо о продукте',
      category: 'Категория',
      sku: 'SKU',
      stock: 'Запас',
      price: 'Цена',
      status: 'Статус'
    },
    actions: {
      downloadReport: 'Скачать отчет',
      newOperation: 'Новая операция',
      filter: 'Фильтр',
      process: 'Обработать',
      save: 'Сохранить',
      cancel: 'Отмена',
      edit: 'Изменить',
      delete: 'Удалить'
    },
    common: {
      quantity: 'Кол-во',
      warehouse: 'Склад',
      date: 'Дата',
      product: 'Продукт',
      type: 'Тип',
      id: 'ID'
    }
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      warehouses: 'Warehouses',
      products: 'Products',
      stockIn: 'Stock In',
      stockOut: 'Stock Out',
      transfers: 'Transfers',
      reports: 'Reports',
      systemGen: 'System Gen',
      userManagement: 'Users',
      settings: 'Settings',
      menu: 'Menu',
      administration: 'Administration'
    },
    dashboard: {
      title: 'Dashboard',
      description: 'Overview of OmniStock inventory and warehouse operations.',
      totalStockValue: 'Total Stock Value',
      activeWarehouses: 'Active Warehouses',
      monthlyStockIn: 'Monthly Stock In',
      monthlyStockOut: 'Monthly Stock Out',
      stockMovements: 'Stock Movements',
      lowStockAlerts: 'Low Stock Alerts',
      recentMovements: 'Recent Movements',
      viewAll: 'View All Alerts'
    },
    warehouses: {
      title: 'Warehouses',
      description: 'Manage and monitor all your storage facilities.',
      addNew: 'Add New Warehouse',
      search: 'Search warehouses...',
      manager: 'Manager',
      contact: 'Contact',
      utilization: 'Stock Utilization'
    },
    products: {
      title: 'Products Catalog',
      description: 'Manage your inventory items, SKUs, and stock levels.',
      addNew: 'Add New Product',
      search: 'Search by name, SKU or category...',
      productInfo: 'Product info',
      category: 'Category',
      sku: 'SKU',
      stock: 'Stock',
      price: 'Price',
      status: 'Status'
    },
    actions: {
      downloadReport: 'Download Report',
      newOperation: 'New Operation',
      filter: 'Filter',
      process: 'Process',
      save: 'Save Changes',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete'
    },
    common: {
      quantity: 'Quantity',
      warehouse: 'Warehouse',
      date: 'Date',
      product: 'Product',
      type: 'Type',
      id: 'ID'
    }
  }
};
