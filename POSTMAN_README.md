# Postman Collection - Vintage Nenshitt API

## Daftar Isi
1. [Instalasi & Setup](#instalasi--setup)
2. [Struktur Collection](#struktur-collection)
3. [Menggunakan Collection](#menggunakan-collection)
4. [Environment Variables](#environment-variables)
5. [Endpoint Summary](#endpoint-summary)
6. [Notes Penting](#notes-penting)

## Instalasi & Setup

### 1. Import Collection ke Postman
- Buka Postman
- Klik `File` → `Import`
- Pilih file `Postman_Collection.json`
- Collection akan otomatis di-import dengan semua folders dan requests

### 2. Setup Environment Variables
Setelah import, set environment variables berikut:

**base_url** (default: `http://localhost:3001/api`)
- Gunakan untuk development: `http://localhost:3001/api`
- Gunakan untuk production: `https://your-domain.com/api` (sesuaikan dengan URL production)

**access_token** (untuk authenticated requests)
- Login terlebih dahulu menggunakan endpoint `Auth > Login`
- Copy token dari response
- Paste ke variable `access_token` di Postman

---

## Struktur Collection

Collection diorganisir dalam 9 folder utama:

### 📁 Auth
Endpoints untuk autentikasi user:
- `POST /auth/register` - Registrasi user baru
- `POST /auth/login` - Login dan dapatkan JWT token

### 📁 Products
Endpoints untuk manajemen produk:
- `GET /products` - Lihat semua produk (public)
- `GET /products/:id` - Lihat detail produk (public)
- `POST /products` - Tambah produk baru (admin only)
- `PUT /products/:id` - Update produk (admin only)
- `DELETE /products/:id` - Hapus produk (admin only)

### 📁 Categories
Endpoints untuk kategori produk:
- `GET /categories` - Lihat semua kategori (public)
- `GET /categories/:id` - Lihat detail kategori (public)
- `POST /categories` - Tambah kategori baru (admin only)
- `PUT /categories/:id` - Update kategori (admin only)
- `DELETE /categories/:id` - Hapus kategori (admin only)

### 📁 Users
Endpoints untuk manajemen user:
- `GET /users/profile` - Lihat profil user saat ini
- `PUT /users/profile` - Update profil user saat ini
- `GET /users` - Lihat semua user (admin only)
- `GET /users/:id` - Lihat detail user (admin only)
- `PUT /users/:id` - Update user (admin only)
- `DELETE /users/:id` - Hapus user (admin only)

### 📁 Cart
Endpoints untuk shopping cart:
- `GET /carts` - Lihat keranjang belanja user
- `POST /carts` - Tambah produk ke keranjang
- `PUT /carts/:id` - Update jumlah item di keranjang
- `DELETE /carts/:id` - Hapus item dari keranjang
- `DELETE /carts` - Hapus semua item dari keranjang

### 📁 Orders
Endpoints untuk manajemen pesanan:
- `POST /orders/checkout` - Checkout pesanan
- `GET /orders` - Lihat semua pesanan user
- `GET /orders/:id` - Lihat detail pesanan
- `PUT /orders/:id/status` - Update status pesanan (admin only)
- `PUT /orders/:id/cancel` - Batalkan pesanan

### 📁 Order Items
Endpoints untuk item dalam pesanan:
- `GET /order-items/order/:orderId` - Lihat semua item dalam pesanan
- `GET /order-items/:id` - Lihat detail item pesanan

### 📁 Payments
Endpoints untuk pembayaran:
- `GET /payments/order/:orderId` - Lihat informasi pembayaran pesanan
- `GET /payments` - Lihat semua pembayaran (admin only)
- `GET /payments/:id` - Lihat detail pembayaran (admin only)
- `POST /payments/paypal/capture/:paypalOrderId` - Capture pembayaran PayPal
- `POST /payments/midtrans/notification` - Webhook Midtrans (public)
- `POST /payments/paypal/webhook` - Webhook PayPal (public)

### 📁 Shipping
Endpoints untuk pengiriman:
- `GET /shippings` - Lihat semua pengiriman (admin only)
- `GET /shippings/order/:orderId` - Lihat pengiriman pesanan
- `POST /shippings` - Buat pengiriman baru (admin only)
- `PUT /shippings/:id` - Update pengiriman (admin only)
- `PUT /shippings/:id/status` - Update status pengiriman (admin only)

---

## Menggunakan Collection

### Flow Dasar Testing:

#### 1. **Register & Login**
```
1. Auth > Register
   - Isi email, password, username, fullName, phone, address
   - Klik Send
   
2. Auth > Login
   - Isi email dan password yang sama
   - Copy token dari response
   - Set ke variable 'access_token' di Postman
```

#### 2. **Browse Products & Categories (Public)**
```
1. Products > Get All Products
2. Categories > Get All Categories
3. Products > Get Product By ID (set :id = 1)
```

#### 3. **Shopping Cart**
```
1. Cart > Add To Cart
   - Set productId: 1, quantity: 2
   
2. Cart > Get Cart
   - Lihat item yang ditambahkan
   
3. Cart > Update Cart Item
   - Update quantity ke 3
   
4. Cart > Remove Cart Item
   - Hapus item tertentu
```

#### 4. **Checkout & Orders**
```
1. Orders > Checkout
   - Isi shipping details dan payment method
   - Tentukan items yang ingin dipesan
   
2. Orders > Get All Orders
   - Lihat semua pesanan user
   
3. Orders > Get Order By ID
   - Lihat detail pesanan spesifik
```

#### 5. **Payments**
```
1. Payments > Get Payment By Order ID
   - Lihat status pembayaran
```

#### 6. **Admin Operations**
```
1. Products > Create Product (admin only)
   - Buat produk baru
   
2. Orders > Update Order Status (admin only)
   - Update status pesanan
   
3. Shipping > Create Shipping (admin only)
   - Buat pengiriman untuk pesanan
   
4. Shipping > Update Delivery Status (admin only)
   - Update status pengiriman
```

---

## Environment Variables

### Built-in Variables:

| Variable | Default Value | Deskripsi |
|----------|---------------|-----------|
| `base_url` | `http://localhost:3001/api` | Base URL API |
| `access_token` | (kosong) | JWT token dari login |

### Cara Menggunakan Variables:
```
- Di URL: {{base_url}}/products
- Di Headers: Authorization: Bearer {{access_token}}
- Di Body: 
  {
    "productId": {{product_id}}
  }
```

### Cara Set Variable:
1. Click tab "Variables" di atas
2. Ubah value di kolom "Initial value" atau "Current value"
3. Klik Save
4. Variable otomatis tersimpan dalam collection

---

## Endpoint Summary

### Authentication Required
Endpoints berikut memerlukan JWT token di header:
```
Authorization: Bearer {{access_token}}
```

**User Endpoints:**
- Semua endpoints di Orders, Cart, User Profile, Order Items memerlukan auth

**Admin Only Endpoints:**
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`
- `PUT /orders/:id/status`
- `GET /payments`
- `GET /payments/:id`
- `GET /shippings`
- `POST /shippings`
- `PUT /shippings/:id`
- `PUT /shippings/:id/status`

### Public Endpoints (No Auth Required)
- `POST /auth/register`
- `POST /auth/login`
- `GET /products`
- `GET /products/:id`
- `GET /categories`
- `GET /categories/:id`
- `POST /payments/midtrans/notification` (webhook)
- `POST /payments/paypal/webhook` (webhook)
- `GET /health`

---

## Notes Penting

### ⚠️ Parameter ID
Saat menggunakan endpoint dengan `:id` atau `:orderId`, ganti dengan nilai actual:
- ❌ `GET {{base_url}}/products/:id`
- ✅ `GET {{base_url}}/products/1`

### 🔒 JWT Token
- Token dapat expire, login kembali jika mendapat error 401
- Set token di variable `access_token` untuk digunakan di semua authenticated requests

### 📝 Request Body
Pastikan Content-Type header sudah set ke `application/json` saat mengirim POST/PUT requests

### 🔄 Order Status
Valid order statuses:
- `pending` - Pesanan pending pembayaran
- `confirmed` - Pembayaran dikonfirmasi
- `shipped` - Pesanan sudah dikirim
- `delivered` - Pesanan sudah diterima
- `cancelled` - Pesanan dibatalkan

### 📦 Shipping Status
Valid shipping statuses:
- `pending` - Pengiriman pending
- `in_transit` - Sedang dalam perjalanan
- `delivered` - Sudah diterima
- `failed` - Pengiriman gagal

### 💳 Payment Methods
Supported payment methods untuk checkout:
- `midtrans` - Midtrans gateway
- `paypal` - PayPal payment

### 📧 Response Errors
Jika mendapat error, check:
1. Status code response (3xx, 4xx, 5xx)
2. Error message dalam response body
3. Authorization header untuk authenticated requests
4. Validasi data dalam request body

---

## Tips & Tricks

### 1. Test Multiple Scenarios
- Gunakan Tests tab di setiap request untuk assert response
- Buat test suite untuk full workflow testing

### 2. Save Response ke Variable
Di tab "Tests", gunakan:
```javascript
var jsonData = pm.response.json();
pm.environment.set("product_id", jsonData.data.id);
```

### 3. Pre-request Script
Setup di tab "Pre-request Script" untuk persiapan request:
```javascript
// Contoh: Set timestamp
pm.environment.set("timestamp", new Date().getTime());
```

### 4. Generate Documentation
Postman bisa auto-generate API documentation:
- Klik menu Collections
- Select collection
- Klik "View documentation"

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| 401 Unauthorized | Login terlebih dahulu, set access_token |
| 403 Forbidden | Pastikan user adalah admin untuk endpoint admin-only |
| 404 Not Found | Cek URL dan parameter ID sudah benar |
| 422 Validation Error | Cek request body sesuai dengan validation rules |
| ECONNREFUSED | Pastikan server berjalan di port 3001 |

---

**Happy Testing! 🚀**
