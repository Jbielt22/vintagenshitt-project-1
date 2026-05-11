# Vintage Nenshitt API - Quick Reference Guide

## 🚀 Quick Start

### 1. Import Files
- `Postman_Collection.json` → File > Import
- `Postman_Environment.json` → Manage Environments > Import

### 2. Setup
```
1. Set base_url: http://localhost:3001/api
2. Register > Login > Copy token to access_token
3. Ready to test!
```

---

## 📋 All Endpoints Cheat Sheet

### 🔐 AUTH (No Auth Required)
```
POST   /auth/register          Register user
POST   /auth/login             Login & get token
```

### 🛍️ PRODUCTS
```
GET    /products               Get all (public)
GET    /products/:id           Get one (public)
POST   /products               Create (admin)
PUT    /products/:id           Update (admin)
DELETE /products/:id           Delete (admin)
```

### 📂 CATEGORIES
```
GET    /categories             Get all (public)
GET    /categories/:id         Get one (public)
POST   /categories             Create (admin)
PUT    /categories/:id         Update (admin)
DELETE /categories/:id         Delete (admin)
```

### 👤 USERS
```
GET    /users/profile          Get my profile (auth)
PUT    /users/profile          Update my profile (auth)
GET    /users                  Get all (admin)
GET    /users/:id              Get one (admin)
PUT    /users/:id              Update (admin)
DELETE /users/:id              Delete (admin)
```

### 🛒 CART
```
GET    /carts                  Get cart (auth)
POST   /carts                  Add item (auth)
PUT    /carts/:id              Update qty (auth)
DELETE /carts/:id              Remove item (auth)
DELETE /carts                  Clear cart (auth)
```

### 📦 ORDERS
```
POST   /orders/checkout        Checkout (auth)
GET    /orders                 Get all (auth)
GET    /orders/:id             Get one (auth)
PUT    /orders/:id/status      Update status (admin)
PUT    /orders/:id/cancel      Cancel (auth)
```

### 📋 ORDER ITEMS
```
GET    /order-items/order/:id  Get items in order (auth)
GET    /order-items/:id        Get one item (auth)
```

### 💳 PAYMENTS
```
GET    /payments/order/:id     Get payment (auth)
GET    /payments               Get all (admin)
GET    /payments/:id           Get one (admin)
POST   /payments/paypal/capture/:id  Capture PayPal (auth)
POST   /payments/midtrans/notification  Webhook (public)
POST   /payments/paypal/webhook         Webhook (public)
```

### 📮 SHIPPING
```
GET    /shippings              Get all (admin)
GET    /shippings/order/:id    Get shipping (auth)
POST   /shippings              Create (admin)
PUT    /shippings/:id          Update (admin)
PUT    /shippings/:id/status   Update status (admin)
```

### 💚 HEALTH
```
GET    /health                 Health check (public)
```

---

## 📝 Common Request Bodies

### Register
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username",
  "fullName": "Full Name",
  "phone": "081234567890",
  "address": "Jl. Example No. 123"
}
```

### Login
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Add to Cart
```json
{
  "productId": 1,
  "quantity": 2
}
```

### Checkout
```json
{
  "shippingAddress": "Jl. Pengiriman No. 123",
  "shippingCity": "Jakarta",
  "shippingProvince": "DKI Jakarta",
  "shippingZipCode": "12345",
  "shippingPhone": "081234567890",
  "paymentMethod": "midtrans",
  "items": [
    {"productId": 1, "quantity": 2}
  ]
}
```

### Create Product
```json
{
  "name": "Product Name",
  "description": "Description",
  "price": 100000,
  "stock": 50,
  "categoryId": 1,
  "image": "https://example.com/image.jpg"
}
```

### Create Shipping
```json
{
  "orderId": 1,
  "shippingProvider": "jne",
  "trackingNumber": "JNE123456789",
  "estimatedDelivery": "2024-01-10",
  "shippingAddress": "Jl. Pengiriman No. 123",
  "shippingCity": "Jakarta",
  "shippingProvince": "DKI Jakarta",
  "shippingZipCode": "12345"
}
```

---

## 🔑 Required Headers

### Authenticated Requests
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

### Webhook Endpoints
```
Content-Type: application/json
(signature verified inside)
```

---

## ✅ Valid Values

### Order Status
- `pending` - Menunggu pembayaran
- `confirmed` - Pembayaran dikonfirmasi
- `shipped` - Sudah dikirim
- `delivered` - Sudah diterima
- `cancelled` - Dibatalkan

### Shipping Status
- `pending` - Menunggu
- `in_transit` - Dalam perjalanan
- `delivered` - Sudah diterima
- `failed` - Pengiriman gagal

### Payment Methods
- `midtrans` - Midtrans gateway
- `paypal` - PayPal

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **401 Unauthorized** | Login first & set access_token |
| **403 Forbidden** | Check if you're admin (for admin endpoints) |
| **404 Not Found** | Check URL params (id) are correct |
| **422 Validation Error** | Check request body matches schema |
| **Connection Refused** | Start server at port 3001 |

---

## 💡 Pro Tips

### 1. Set Token After Login
```
1. Run Auth > Login
2. In response, copy "token" field
3. Set to {{access_token}} variable
4. Use in all authenticated requests
```

### 2. Create Test Flow
```
Register → Login → Browse Products → Add Cart → Checkout → Check Order
```

### 3. Admin Testing
```
1. Register with email: admin@example.com
2. Manually set role to "admin" in database
3. Use admin endpoints
```

### 4. Monitor Requests
```
View > Show Postman Console (Ctrl+Alt+C)
See all request/response details
```

---

## 📞 Support

If you encounter issues:
1. Check POSTMAN_README.md for detailed docs
2. Verify request format matches examples
3. Check server logs for error details
4. Test with curl:
   ```bash
   curl -X GET http://localhost:3001/api/health
   ```

---

**Last Updated: May 2024**
