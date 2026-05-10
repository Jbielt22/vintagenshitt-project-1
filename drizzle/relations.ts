import { relations } from 'drizzle-orm/relations';
import {
  categories,
  products,
  carts,
  users,
  orders,
  orderItems,
  payments,
  shippings,
} from './schema';

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  carts: many(carts),
  orderItems: many(orderItems),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const cartsRelations = relations(carts, ({ one }) => ({
  product: one(products, {
    fields: [carts.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  carts: many(carts),
  orders: many(orders),
  payments: many(payments),
  shippings: many(shippings),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
  payments: many(payments),
  shippings: many(shippings),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const shippingsRelations = relations(shippings, ({ one }) => ({
  order: one(orders, {
    fields: [shippings.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [shippings.userId],
    references: [users.id],
  }),
}));
