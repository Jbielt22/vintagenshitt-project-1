/**
 * Generic request body validation middleware factory.
 * @param {object} rules - Object where keys are field names, values are { required, type, minLength, maxLength, enum, min }
 * @returns {Function} Express middleware
 */
export function validateBody(rules) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      if (
        rule.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push(`${field} is required.`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be of type ${rule.type}.`);
      }

      if (
        rule.minLength &&
        typeof value === 'string' &&
        value.length < rule.minLength
      ) {
        errors.push(`${field} must be at least ${rule.minLength} characters.`);
      }

      if (
        rule.maxLength &&
        typeof value === 'string' &&
        value.length > rule.maxLength
      ) {
        errors.push(`${field} must be at most ${rule.maxLength} characters.`);
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(', ')}.`);
      }

      if (
        rule.min !== undefined &&
        typeof value === 'number' &&
        value < rule.min
      ) {
        errors.push(`${field} must be at least ${rule.min}.`);
      }

      if (rule.isArray && !Array.isArray(value)) {
        errors.push(`${field} must be an array.`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors,
      });
    }

    next();
  };
}

// Pre-built validators

export const validateRegister = validateBody({
  email: { required: true, type: 'string' },
  password: { required: true, type: 'string', minLength: 6 },
  name: { required: true, type: 'string', minLength: 1 },
});

export const validateLogin = validateBody({
  email: { required: true, type: 'string' },
  password: { required: true, type: 'string' },
});

export const validateCheckout = validateBody({
  paymentMethod: { required: true, type: 'string', enum: ['qris', 'paypal'] },
  shippingAddress: { required: true, type: 'string', minLength: 5 },
});

export const validateProduct = validateBody({
  title: { required: true, type: 'string', minLength: 1 },
  price: { required: true, type: 'number', min: 0 },
  quantity: { required: true, type: 'number', min: 0 },
});

export const validateCategory = validateBody({
  name: { required: true, type: 'string', minLength: 1 },
});

export const validateCartItem = validateBody({
  productId: { required: true, type: 'number', min: 1 },
  qty: { required: true, type: 'number', min: 1 },
});

export const validateShipping = validateBody({
  orderId: { required: true, type: 'number', min: 1 },
  courier: { required: true, type: 'string' },
});

export const validateShippingUpdate = validateBody({
  deliveryStatus: {
    required: true,
    type: 'string',
    enum: ['pending', 'shipping', 'out_for_delivery', 'arrived', 'returned'],
  },
});
