const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get PayPal OAuth2 access token (cached until expiry)
 */
export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Expire 60 seconds early to be safe
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

/**
 * Create a PayPal order
 * @param {string} amount - Total amount
 * @param {string} currency - Currency code (e.g., 'USD')
 * @param {string|number} orderId - Internal order ID for reference
 * @returns {Promise<{paypalOrderId: string, approveUrl: string}>}
 */
export async function createPayPalOrder(amount, currency, orderId) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: String(orderId),
          amount: {
            currency_code: currency,
            value: amount,
          },
        },
      ],
      application_context: {
        return_url: `${process.env.APP_URL || 'http://localhost:3001'}/api/payments/paypal/success`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3001'}/api/payments/paypal/cancel`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal create order failed: ${error}`);
  }

  const data = await response.json();
  const approveLink = data.links.find((link) => link.rel === 'approve');

  return {
    paypalOrderId: data.id,
    approveUrl: approveLink ? approveLink.href : null,
  };
}

/**
 * Capture a PayPal order after user approval
 * @param {string} paypalOrderId
 * @returns {Promise<object>} Capture result
 */
export async function capturePayPalOrder(paypalOrderId) {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal capture failed: ${error}`);
  }

  return response.json();
}

/**
 * Verify PayPal webhook signature
 * @param {object} headers - Request headers
 * @param {object} body - Request body
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(headers, body) {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: body,
      }),
    }
  );

  if (!response.ok) return false;

  const data = await response.json();
  return data.verification_status === 'SUCCESS';
}
