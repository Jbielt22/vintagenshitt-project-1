import {
  pgTable,
  unique,
  integer,
  varchar,
  timestamp,
  text,
  foreignKey,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const categoryStatus = pgEnum('categoryStatus', ['draft', 'active']);
export const deliveryEnum = pgEnum('deliveryEnum', [
  'pending',
  'shipping',
  'out_for_delivery',
  'arrived',
  'returned',
]);
export const orderStatus = pgEnum('orderStatus', [
  'pending',
  'processing',
  'shipped',
  'completed',
  'cancelled',
]);
export const paymentEnum = pgEnum('paymentEnum', [
  'pending',
  'paid',
  'failed',
  'refund',
]);
export const userRole = pgEnum('userRole', ['admin', 'user']);

export const users = pgTable(
  'users',
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'users_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    email: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }),
    password: varchar({ length: 255 }),
    role: userRole().default('user'),
    country: varchar({ length: 255 }),
    province: varchar({ length: 255 }),
    city: varchar({ length: 255 }),
    address: varchar({ length: 255 }),
    postalCode: varchar('postal_code', { length: 10 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [unique('users_email_key').on(table.email)]
);

export const categories = pgTable('categories', {
  id: integer()
    .primaryKey()
    .generatedByDefaultAsIdentity({
      name: 'categories_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  status: categoryStatus().default('active'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export const products = pgTable(
  'products',
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'products_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    imgUrl: text('img_url'),
    title: varchar({ length: 255 }).notNull(),
    categoryId: integer('category_id'),
    price: numeric().notNull(),
    quantity: integer().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'products_category_id_fkey',
    }),
  ]
);

export const carts = pgTable(
  'carts',
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'carts_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    userId: integer('user_id'),
    productId: integer('product_id'),
    qty: integer().default(1),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'carts_product_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'carts_user_id_fkey',
    }),
  ]
);

export const orders = pgTable(
  'orders',
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'orders_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    userId: integer('user_id'),
    totalAmount: numeric('total_amount').notNull(),
    status: orderStatus().default('pending'),
    shippingAddress: text('shipping_address'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'orders_user_id_fkey',
    }),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'order_items_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    orderId: integer('order_id'),
    productId: integer('product_id'),
    priceAtPurchase: numeric('price_at_purchase').notNull(),
    quantity: integer().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: 'order_items_order_id_fkey',
    }),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'order_items_product_id_fkey',
    }),
  ]
);

export const payments = pgTable(
  'payments',
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'payments_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    orderId: integer('order_id'),
    userId: integer('user_id'),
    paymentStatus: paymentEnum('payment_status').default('pending'),
    amount: numeric().notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: 'payments_order_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'payments_user_id_fkey',
    }),
  ]
);

export const shippings = pgTable(
  'shippings',
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'shippings_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    orderId: integer('order_id'),
    userId: integer('user_id'),
    courier: varchar({ length: 255 }),
    trackingNumber: varchar('tracking_number', { length: 255 }),
    deliveryStatus: deliveryEnum('delivery_status').default('pending'),
    shippedAt: timestamp('shipped_at', { mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: 'shippings_order_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'shippings_user_id_fkey',
    }),
    unique('shippings_order_id_key').on(table.orderId),
  ]
);
