import crypto from 'crypto';

export const FEATURED_PAYMENT_SETTING_KEY = 'featuredPayment';
export const FEATURED_PAYMENT_MODES = ['WALLET', 'RAZORPAY', 'BOTH'];
export const FEATURED_PAYMENT_METHODS = ['WALLET', 'RAZORPAY'];

const DEFAULT_SETTINGS = {
  mode: 'WALLET',
  currency: 'INR',
  razorpayKeyId: '',
  allowUnpaidAdminApproval: true
};

export function normalizeBillingCurrency(value) {
  const currency = String(value || DEFAULT_SETTINGS.currency).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_SETTINGS.currency;
}

export function normalizePaymentMode(value) {
  const mode = String(value || DEFAULT_SETTINGS.mode).trim().toUpperCase();
  return FEATURED_PAYMENT_MODES.includes(mode) ? mode : DEFAULT_SETTINGS.mode;
}

export function paymentMethodAllowed(mode, method) {
  const normalizedMode = normalizePaymentMode(mode);
  const normalizedMethod = String(method || '').trim().toUpperCase();
  if (!FEATURED_PAYMENT_METHODS.includes(normalizedMethod)) return false;
  return normalizedMode === 'BOTH' || normalizedMode === normalizedMethod;
}

export function publicPaymentSettings(settings = DEFAULT_SETTINGS) {
  const mode = normalizePaymentMode(settings.mode);
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || settings.razorpayKeyId || '';
  const razorpayConfigured = Boolean(razorpayKeyId && process.env.RAZORPAY_KEY_SECRET);
  return {
    mode,
    currency: normalizeBillingCurrency(settings.currency),
    walletEnabled: mode === 'WALLET' || mode === 'BOTH',
    razorpayEnabled: (mode === 'RAZORPAY' || mode === 'BOTH') && razorpayConfigured,
    razorpayConfigured,
    razorpayKeyId,
    allowUnpaidAdminApproval: settings.allowUnpaidAdminApproval !== false
  };
}

export async function getFeaturedPaymentSettings(prisma) {
  const setting = await prisma.appSetting.findUnique({ where: { key: FEATURED_PAYMENT_SETTING_KEY } });
  return {
    ...DEFAULT_SETTINGS,
    ...(setting?.value && typeof setting.value === 'object' ? setting.value : {})
  };
}

export async function saveFeaturedPaymentSettings(prisma, input = {}) {
  const value = {
    mode: normalizePaymentMode(input.mode),
    currency: normalizeBillingCurrency(input.currency),
    razorpayKeyId: String(input.razorpayKeyId || '').trim(),
    allowUnpaidAdminApproval: input.allowUnpaidAdminApproval !== false
  };
  return prisma.appSetting.upsert({
    where: { key: FEATURED_PAYMENT_SETTING_KEY },
    update: { value },
    create: { key: FEATURED_PAYMENT_SETTING_KEY, value }
  });
}

export function normalizeAmount(value, fallback = 0) {
  const amount = Number(value ?? fallback);
  if (!Number.isFinite(amount)) return fallback;
  return Math.max(0, Math.round(amount));
}

export function walletAvailable(wallet) {
  return Math.max(0, normalizeAmount(wallet?.balance) - normalizeAmount(wallet?.heldBalance));
}

export async function getOrCreateWallet(client, userId, currency = DEFAULT_SETTINGS.currency) {
  if (!userId) throw Object.assign(new Error('Wallet owner is required.'), { statusCode: 400 });
  const existing = await client.userWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return client.userWallet.create({
    data: {
      userId,
      currency: normalizeBillingCurrency(currency)
    }
  });
}

export async function creditWallet(client, {
  userId,
  amount,
  currency = DEFAULT_SETTINGS.currency,
  reason,
  adminUserId,
  referenceType,
  referenceId,
  metadata = {}
}) {
  const normalizedAmount = normalizeAmount(amount);
  if (normalizedAmount <= 0) throw Object.assign(new Error('Wallet credit amount must be greater than zero.'), { statusCode: 400 });
  const wallet = await getOrCreateWallet(client, userId, currency);
  const updatedWallet = await client.userWallet.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: normalizedAmount },
      currency: normalizeBillingCurrency(currency)
    }
  });
  const transaction = await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type: 'CREDIT',
      amount: normalizedAmount,
      currency: normalizeBillingCurrency(currency),
      reason: reason || 'Admin wallet credit',
      adminUserId: adminUserId || null,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      metadata
    }
  });
  return { wallet: updatedWallet, transaction };
}

export async function holdWalletAmount(client, {
  userId,
  amount,
  currency = DEFAULT_SETTINGS.currency,
  reason,
  referenceType,
  referenceId,
  metadata = {}
}) {
  const normalizedAmount = normalizeAmount(amount);
  if (normalizedAmount <= 0) throw Object.assign(new Error('Featured placement price is missing.'), { statusCode: 400 });
  const wallet = await getOrCreateWallet(client, userId, currency);
  if (normalizeBillingCurrency(wallet.currency) !== normalizeBillingCurrency(currency)) {
    throw Object.assign(new Error('Wallet currency does not match this featured request.'), { statusCode: 400 });
  }
  if (walletAvailable(wallet) < normalizedAmount) {
    throw Object.assign(new Error('Insufficient wallet balance for this featured placement.'), { statusCode: 402 });
  }
  const updatedWallet = await client.userWallet.update({
    where: { id: wallet.id },
    data: { heldBalance: { increment: normalizedAmount } }
  });
  const transaction = await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type: 'HOLD',
      amount: normalizedAmount,
      currency: normalizeBillingCurrency(currency),
      reason: reason || 'Featured placement hold',
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      metadata
    }
  });
  return { wallet: updatedWallet, transaction };
}

export async function captureWalletHold(client, {
  userId,
  amount,
  currency = DEFAULT_SETTINGS.currency,
  reason,
  referenceType,
  referenceId,
  metadata = {}
}) {
  const normalizedAmount = normalizeAmount(amount);
  if (normalizedAmount <= 0) return null;
  const wallet = await getOrCreateWallet(client, userId, currency);
  if (wallet.heldBalance < normalizedAmount) return null;
  const updatedWallet = await client.userWallet.update({
    where: { id: wallet.id },
    data: {
      balance: { decrement: normalizedAmount },
      heldBalance: { decrement: normalizedAmount }
    }
  });
  const transaction = await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type: 'DEBIT',
      amount: normalizedAmount,
      currency: normalizeBillingCurrency(currency),
      reason: reason || 'Featured placement approved',
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      metadata
    }
  });
  return { wallet: updatedWallet, transaction };
}

export async function releaseWalletHold(client, {
  userId,
  amount,
  currency = DEFAULT_SETTINGS.currency,
  reason,
  referenceType,
  referenceId,
  metadata = {}
}) {
  const normalizedAmount = normalizeAmount(amount);
  if (normalizedAmount <= 0) return null;
  const wallet = await getOrCreateWallet(client, userId, currency);
  const releaseAmount = Math.min(wallet.heldBalance, normalizedAmount);
  if (releaseAmount <= 0) return null;
  const updatedWallet = await client.userWallet.update({
    where: { id: wallet.id },
    data: { heldBalance: { decrement: releaseAmount } }
  });
  const transaction = await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type: 'RELEASE',
      amount: releaseAmount,
      currency: normalizeBillingCurrency(currency),
      reason: reason || 'Featured placement rejected',
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      metadata
    }
  });
  return { wallet: updatedWallet, transaction };
}

export async function createRazorpayOrder({
  amount,
  currency = DEFAULT_SETTINGS.currency,
  receipt,
  notes = {},
  keyId: configuredKeyId
}) {
  const keyId = configuredKeyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw Object.assign(new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET first.'), { statusCode: 400 });
  }
  const normalizedAmount = normalizeAmount(amount);
  if (normalizedAmount <= 0) throw Object.assign(new Error('Razorpay order amount must be greater than zero.'), { statusCode: 400 });
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: normalizedAmount * 100,
      currency: normalizeBillingCurrency(currency),
      receipt: String(receipt || `featured_${Date.now()}`).slice(0, 40),
      notes
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.description || payload?.error?.reason || 'Razorpay order could not be created.';
    throw Object.assign(new Error(message), { statusCode: response.status >= 400 && response.status < 500 ? 400 : 502 });
  }
  return payload;
}

export function verifyRazorpayPaymentSignature({ orderId, paymentId, signature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const actual = String(signature || '');
  if (!actual || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
