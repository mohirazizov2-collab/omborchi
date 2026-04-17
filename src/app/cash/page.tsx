rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============ AUTH FUNKSIYALARI ============

    function isAuthenticated() {
      return request.auth != null;
    }

    function isMasterAdmin() {
      return isAuthenticated() &&
        request.auth.token.email == "f2472839@gmail.com";
    }

    // Staff hujjatidan role ni olish (custom claims ishlamasa ham ishlaydi)
    function getUserRole() {
      return get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.role;
    }

    function hasRole(role) {
      return isAuthenticated() && (
        isMasterAdmin() ||
        (request.auth.token.role == role) ||
        // Fallback: Firestore dan o'qish (custom claims yo'q bo'lsa)
        getUserRole() == role
      );
    }

    function isAdmin() {
      return isAuthenticated() && (
        isMasterAdmin() ||
        request.auth.token.role in ["admin", "master"] ||
        getUserRole() in ["admin", "master"]
      );
    }

    function isCashier() {
      return isAuthenticated() && (
        isMasterAdmin() ||
        request.auth.token.role in ["cashier", "admin", "master"] ||
        getUserRole() in ["cashier", "admin", "master"]
      );
    }

    // ============ VALIDATION ============

    function validProduct() {
      let d = request.resource.data;
      return d.keys().hasAll(["name", "price", "stock", "category", "warehouseId"]) &&
             d.name is string && d.name.size() > 0 &&
             d.price is number && d.price > 0 &&
             d.stock is number && d.stock >= 0 &&
             d.category is string &&
             d.warehouseId is string;
    }

    function validSale() {
      let d = request.resource.data;
      return d.keys().hasAll(["items", "total", "warehouseId"]) &&
             d.items is list && d.items.size() > 0 &&
             d.total is number && d.total >= 0 &&
             d.warehouseId is string;
    }

    function validStaff() {
      let d = request.resource.data;
      return d.keys().hasAll(["email", "role", "name"]) &&
             d.email is string &&
             d.role in ["master", "admin", "cashier", "seller"] &&
             d.name is string && d.name.size() > 0;
    }

    // ============ STAFF / USERS ============
    // Bu kolleksiya getUserRole() uchun kerak — eng muhim!
    match /staff/{userId} {
      // Foydalanuvchi o'z hujjatini o'qiy oladi
      allow read: if isAuthenticated() && (
        request.auth.uid == userId || isAdmin()
      );
      allow create: if isMasterAdmin() && validStaff();
      allow update: if isMasterAdmin() && validStaff();
      allow delete: if isMasterAdmin();
    }

    // ============ PRODUCTS ============
    match /products/{productId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin() && validProduct();
      allow update: if isAdmin() && validProduct();
      allow delete: if isMasterAdmin();
    }

    // ============ WAREHOUSES ============
    match /warehouses/{warehouseId} {
      allow read: if isAuthenticated();
      allow create: if isMasterAdmin();
      allow update: if isAdmin(); // Admin ham update qila olsin
      allow delete: if isMasterAdmin();
    }

    // ============ CUSTOMERS ============
    match /customers/{customerId} {
      allow read: if isAuthenticated();
      allow create: if isCashier(); // Cashier ham yaratsin
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ SALES / TRANSACTIONS ============
    match /sales/{saleId} {
      allow read: if isAuthenticated();
      allow create: if isCashier() && validSale();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ EMPLOYEES ============
    match /employees/{employeeId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ EXPENSES ============
    match /expenses/{expenseId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ REPORTS ============
    match /reports/{reportId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update: if isMasterAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ CATEGORIES ============
    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ NOTIFICATIONS ============
    match /notifications/{notificationId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      // Faqat o'z notifikatsiyasini read qilib update qilsin
      allow update: if isAuthenticated() && (
        isAdmin() ||
        resource.data.userId == request.auth.uid
      );
      allow delete: if isAdmin();
    }

    // ============ SETTINGS ============
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow create: if isMasterAdmin();
      allow update: if isMasterAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ LOGS ============
    match /logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated(); // Har kim log yoza olsin
      allow update: if false;            // Hech kim o'zgartira olmaydi
      allow delete: if isMasterAdmin();
    }

    // ============ ORDERS ============
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create: if isCashier();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ INVENTORY ============
    match /inventory/{itemId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ TRANSFERS ============
    match /transfers/{transferId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ PAYMENTS ============
    match /payments/{paymentId} {
      allow read: if isAuthenticated();
      allow create: if isCashier();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ SUPPLIERS ============
    match /suppliers/{supplierId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isMasterAdmin();
    }

    // ============ FALLBACK (oxirgi qoida) ============
    // Yuqorida ko'rsatilmagan kolleksiyalar uchun
    match /{collection}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isMasterAdmin();
    }
  }
}
