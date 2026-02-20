
export type Language = 'uz' | 'ru' | 'en';

export const translations = {
  uz: {
    nav: {
      dashboard: 'Dashboard',
      warehouses: 'Omborlar',
      products: 'Mahsulotlar',
      stockIn: 'Kirish',
      stockOut: 'Chiqish',
      transfers: 'Transferlar',
      reports: 'Hisobotlar',
      systemGen: 'Tizim Gen',
      userManagement: 'Foydalanuvchilar',
      settings: 'Sozlamalar',
      menu: 'Menyu',
      administration: 'Administratsiya',
      profile: 'Profil'
    },
    dashboard: {
      title: 'Boshqaruv paneli',
      description: 'omborchi.uz inventar va ombor operatsiyalari umumiy ko\'rinishi.',
      totalStockValue: 'Jami zaxira qiymati',
      activeWarehouses: 'Faol omborlar',
      monthlyStockIn: 'Oylik kirish',
      monthlyStockOut: 'Oylik chiqish',
      stockMovements: 'Zaxira harakati',
      lowStockAlerts: 'Kam qolgan mahsulotlar',
      recentMovements: 'Oxirgi harakatlar',
      viewAll: 'Hammasini ko\'rish'
    },
    profile: {
      title: 'Foydalanuvchi profili',
      description: 'Shaxsiy ma\'lumotlar va hisob sozlamalari.',
      personalInfo: 'Shaxsiy ma\'lumotlar',
      accountType: 'Hisob turi',
      anonymous: 'Anonim foydalanuvchi',
      authenticated: 'Tasdiqlangan foydalanuvchi',
      userId: 'Foydalanuvchi ID',
      displayName: 'To\'liq ism',
      email: 'Elektron pochta',
      lastLogin: 'Oxirgi kirish',
      signOut: 'Tizimdan chiqish',
      editProfile: 'Profilni tahrirlash'
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
    stockIn: {
      title: 'Tovarlar kirimi (Goods Receipt)',
      description: 'Yetkazib beruvchilardan kelgan tovarlarni qayd etish.',
      dnDetails: 'Yuk xati tafsilotlari',
      dnNumber: 'Yuk xati raqami (DN)',
      receiptDate: 'Kabul qilingan sana',
      supplier: 'Yetkazib beruvchi',
      targetWarehouse: 'Maqsadli ombor',
      productItems: 'Mahsulotlar ro\'yxati',
      process: 'Qabul qilishni yakunlash',
      saveDraft: 'Qoralama sifatida saqlash'
    },
    stockOut: {
      title: 'Tovarlar chiqimi (Goods Issue)',
      description: 'Ombordan tovarlarni chiqarish (mijozlarga yoki loyihalarga).',
      issueDetails: 'Chiqim tafsilotlari',
      refNumber: 'Buyurtma / Referans raqami',
      issueDate: 'Chiqarilgan sana',
      sourceWarehouse: 'Chiqaruvchi ombor',
      recipient: 'Mijoz / Qabul qiluvchi',
      dispatch: 'Tovarni jo\'natish',
      pickingList: 'Terish varaqasini chop etish'
    },
    transfers: {
      title: 'Omborlararo transferlar',
      description: 'Zaxiralarni bir ombordan ikkinchisiga o\'tkazish.',
      routeDetails: 'Yo\'nalish tafsilotlari',
      fromWarehouse: 'Qaysi ombordan',
      toWarehouse: 'Qaysi omborga',
      scheduleDate: 'Rejalashtirilgan sana',
      initiate: 'Transferni boshlash'
    },
    reports: {
      title: 'Analitika va Hisobotlar',
      description: 'Inventar ko\'rsatkichlari va logistika metrikalarini tahlil qiling.',
      export: 'PDF-ga eksport qilish',
      stockValueTrend: 'Zaxira qiymati tendensiyasi',
      categoryDist: 'Kategoriyalar bo\'yicha taqsimot',
      accuracy: 'Inventarizatsiya aniqligi'
    },
    users: {
      title: 'Foydalanuvchilarni boshqarish',
      description: 'Tizimga kirish darajalarini va jamoa a\'zolarini boshqaring.',
      invite: 'Foydalanuvchini taklif qilish',
      role: 'Rol',
      assignedHub: 'Biriktirilgan markaz',
      status: 'Holat'
    },
    settings: {
      title: 'Tizim sozlamalari',
      description: 'omborchi.uz global parametrlarini va xavfsizlikni sozlash.',
      general: 'Umumiy konfiguratsiya',
      companyName: 'Kompaniya nomi',
      currency: 'Valyuta',
      notifications: 'Bildirishnomalar',
      lowStockAlerts: 'Kam zaxira haqida ogohlantirish',
      save: 'O\'zgarishlarni saqlash'
    },
    systemGen: {
      title: 'Tizim generatsiya vositasi',
      description: 'AI yordamida arxitektura artefaktlarini yaratish.',
      inputReqs: 'Talablarni kiritish',
      generate: 'Arxitekturani yaratish',
      database: 'Ma\'lumotlar bazasi',
      structure: 'Tuzilma',
      apiBoilerplate: 'API Boilerplate',
      endpoints: 'Endpointlar'
    },
    actions: {
      downloadReport: 'Hisobotni yuklash',
      newOperation: 'Yangi operatsiya',
      filter: 'Filtrlash',
      process: 'Jarayonni boshlash',
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      edit: 'Tahrirlash',
      delete: 'O\'chirish',
      viewAll: 'Hammasini ko\'rish',
      addItem: 'Buyum qo\'shish'
    },
    common: {
      quantity: 'Miqdor',
      warehouse: 'Ombor',
      date: 'Sana',
      product: 'Mahsulot',
      type: 'Turi',
      id: 'ID',
      summary: 'Xulosa',
      totalItems: 'Jami buyumlar',
      totalValue: 'Jami qiymat',
      price: 'Narx'
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
      administration: 'Администрирование',
      profile: 'Профиль'
    },
    dashboard: {
      title: 'Панель управления',
      description: 'Обзор инвентаря и складских операций omborchi.uz.',
      totalStockValue: 'Общая стоимость запасов',
      activeWarehouses: 'Активные склады',
      monthlyStockIn: 'Месячный приход',
      monthlyStockOut: 'Месячный расход',
      stockMovements: 'Движение запасов',
      lowStockAlerts: 'Низкий уровень запасов',
      recentMovements: 'Последние движения',
      viewAll: 'Посмотреть все'
    },
    profile: {
      title: 'Профиль пользователя',
      description: 'Личная информация и настройки аккаунта.',
      personalInfo: 'Личная информация',
      accountType: 'Тип аккаунта',
      anonymous: 'Анонимный пользователь',
      authenticated: 'Авторизованный пользователь',
      userId: 'ID пользователя',
      displayName: 'Полное имя',
      email: 'Эл. почта',
      lastLogin: 'Последний вход',
      signOut: 'Выйти из системы',
      editProfile: 'Редактировать профиль'
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
    stockIn: {
      title: 'Приход товара (Goods Receipt)',
      description: 'Регистрация входящих товаров по накладным.',
      dnDetails: 'Детали накладной',
      dnNumber: 'Номер накладной (DN)',
      receiptDate: 'Дата получения',
      supplier: 'Поставщик',
      targetWarehouse: 'Целевой склад',
      productItems: 'Список товаров',
      process: 'Завершить прием',
      saveDraft: 'Сохранить черновик'
    },
    stockOut: {
      title: 'Расход товара (Goods Issue)',
      description: 'Выдача товаров со склада (клиентам или на проекты).',
      issueDetails: 'Детали выдачи',
      refNumber: 'Номер заказа / Референс',
      issueDate: 'Дата выдачи',
      sourceWarehouse: 'Склад отгрузки',
      recipient: 'Клиент / Получатель',
      dispatch: 'Отправить товар',
      pickingList: 'Печать листа сборки'
    },
    transfers: {
      title: 'Межскладские переводы',
      description: 'Перемещение запасов между вашими складами.',
      routeDetails: 'Детали маршрута',
      fromWarehouse: 'Со склада',
      toWarehouse: 'На склад',
      scheduleDate: 'Плановая дата',
      initiate: 'Начать перевод'
    },
    reports: {
      title: 'Аналитика и Отчеты',
      description: 'Анализируйте показатели инвентаря и логистические метрики.',
      export: 'Экспорт в PDF',
      stockValueTrend: 'Тренды стоимости запасов',
      categoryDist: 'Распределение по категориям',
      accuracy: 'Точность инвентаризации'
    },
    users: {
      title: 'Управление пользователями',
      description: 'Управляйте уровнями доступа и членами команды.',
      invite: 'Пригласить пользователя',
      role: 'Роль',
      assignedHub: 'Привязанный центр',
      status: 'Статус'
    },
    settings: {
      title: 'Системные настройки',
      description: 'Настройка глобальных параметров omborchi.uz и безопасности.',
      general: 'Общая конфигурация',
      companyName: 'Название компании',
      currency: 'Валюта',
      notifications: 'Уведомления',
      lowStockAlerts: 'Предупреждения о низком запасе',
      save: 'Сохранить изменения'
    },
    systemGen: {
      title: 'Инструмент генерации системы',
      description: 'Создание архитектурных артефактов с помощью ИИ.',
      inputReqs: 'Ввод требований',
      generate: 'Генерировать архитектуру',
      database: 'База данных',
      structure: 'Структура',
      apiBoilerplate: 'API Boilerplate',
      endpoints: 'Эндпоинты'
    },
    actions: {
      downloadReport: 'Скачать отчет',
      newOperation: 'Новая операция',
      filter: 'Фильтр',
      process: 'Обработать',
      save: 'Сохранить',
      cancel: 'Отмена',
      edit: 'Изменить',
      delete: 'Удалить',
      viewAll: 'Посмотреть все',
      addItem: 'Добавить позицию'
    },
    common: {
      quantity: 'Кол-во',
      warehouse: 'Склад',
      date: 'Дата',
      product: 'Продукт',
      type: 'Тип',
      id: 'ID',
      summary: 'Итог',
      totalItems: 'Всего позиций',
      totalValue: 'Общая стоимость',
      price: 'Цена'
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
      administration: 'Administration',
      profile: 'Profile'
    },
    dashboard: {
      title: 'Dashboard',
      description: 'Overview of omborchi.uz inventory and warehouse operations.',
      totalStockValue: 'Total Stock Value',
      activeWarehouses: 'Active Warehouses',
      monthlyStockIn: 'Monthly Stock In',
      monthlyStockOut: 'Monthly Stock Out',
      stockMovements: 'Stock Movements',
      lowStockAlerts: 'Low Stock Alerts',
      recentMovements: 'Recent Movements',
      viewAll: 'View All Alerts'
    },
    profile: {
      title: 'User Profile',
      description: 'Personal information and account settings.',
      personalInfo: 'Personal Information',
      accountType: 'Account Type',
      anonymous: 'Anonymous User',
      authenticated: 'Authenticated User',
      userId: 'User ID',
      displayName: 'Full Name',
      email: 'Email',
      lastLogin: 'Last Login',
      signOut: 'Sign Out',
      editProfile: 'Edit Profile'
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
    stockIn: {
      title: 'Stock In (Goods Receipt)',
      description: 'Record incoming inventory via delivery notes from suppliers.',
      dnDetails: 'Delivery Note Details',
      dnNumber: 'Delivery Note #',
      receiptDate: 'Date of Receipt',
      supplier: 'Supplier',
      targetWarehouse: 'Target Warehouse',
      productItems: 'Product Items',
      process: 'Process Receipt',
      saveDraft: 'Save Draft'
    },
    stockOut: {
      title: 'Stock Out (Goods Issue)',
      description: 'Record items leaving the warehouse for customers or projects.',
      issueDetails: 'Issue Details',
      refNumber: 'Order / Reference #',
      issueDate: 'Date of Issue',
      sourceWarehouse: 'Source Warehouse',
      recipient: 'Client / Recipient',
      dispatch: 'Dispatch Order',
      pickingList: 'Print Picking List'
    },
    transfers: {
      title: 'Inter-Warehouse Transfers',
      description: 'Move stock between your distribution centers and hubs.',
      routeDetails: 'Route Details',
      fromWarehouse: 'Source Warehouse',
      toWarehouse: 'Destination Warehouse',
      scheduleDate: 'Scheduled Date',
      initiate: 'Initiate Transfer'
    },
    reports: {
      title: 'Analytics & Reports',
      description: 'Deep dive into your inventory performance and logistics metrics.',
      export: 'Export PDF',
      stockValueTrend: 'Stock Value Trend',
      categoryDist: 'Category Distribution',
      accuracy: 'Inventory Accuracy'
    },
    users: {
      title: 'User Management',
      description: 'Control access levels and manage team members.',
      invite: 'Invite User',
      role: 'Role',
      assignedHub: 'Assigned Hub',
      status: 'Status'
    },
    settings: {
      title: 'System Settings',
      description: 'Configure omborchi.uz global parameters and security.',
      general: 'General Configuration',
      companyName: 'Company Name',
      currency: 'Currency',
      notifications: 'Notifications',
      lowStockAlerts: 'Low stock alerts',
      save: 'Save Changes'
    },
    systemGen: {
      title: 'System Generation Tool',
      description: 'AI-powered architectural artifacts generator.',
      inputReqs: 'Input Requirements',
      generate: 'Generate Architecture',
      database: 'Database',
      structure: 'Structure',
      apiBoilerplate: 'API Boilerplate',
      endpoints: 'Endpoints'
    },
    actions: {
      downloadReport: 'Download Report',
      newOperation: 'New Operation',
      filter: 'Filter',
      process: 'Process',
      save: 'Save Changes',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      viewAll: 'View All',
      addItem: 'Add Item'
    },
    common: {
      quantity: 'Quantity',
      warehouse: 'Warehouse',
      date: 'Date',
      product: 'Product',
      type: 'Type',
      id: 'ID',
      summary: 'Summary',
      totalItems: 'Total Items',
      totalValue: 'Total Value',
      price: 'Price'
    }
  }
};
