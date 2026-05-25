import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  creditWallet,
  getFeaturedPaymentSettings,
  getOrCreateWallet,
  normalizeAmount,
  normalizeBillingCurrency,
  publicPaymentSettings,
  saveFeaturedPaymentSettings,
  walletAvailable
} from '../utils/billing.js';

const router = Router();

function userSearchWhere(search) {
  const token = String(search || '').trim();
  if (!token) return {};
  return {
    OR: [
      { name: { contains: token, mode: 'insensitive' } },
      { email: { contains: token, mode: 'insensitive' } },
      { profiles: { some: { name: { contains: token, mode: 'insensitive' } } } },
      { profiles: { some: { slug: { contains: token, mode: 'insensitive' } } } }
    ]
  };
}

router.get('/settings', asyncHandler(async (_req, res) => {
  const settings = await getFeaturedPaymentSettings(prisma);
  res.json({ data: publicPaymentSettings(settings) });
}));

router.put('/settings', asyncHandler(async (req, res) => {
  const saved = await saveFeaturedPaymentSettings(prisma, req.body);
  res.json({ data: publicPaymentSettings(saved.value) });
}));

router.get('/wallets', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: {
      role: 'OWNER',
      ...userSearchWhere(req.query.search)
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      wallet: {
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 5 }
        }
      },
      profiles: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          ownerEmail: true,
          countryId: true,
          categoryId: true,
          city: { select: { slug: true, name: true } }
        }
      }
    }
  });

  res.json({
    data: users.map((user) => ({
      ...user,
      wallet: user.wallet ? {
        ...user.wallet,
        availableBalance: walletAvailable(user.wallet)
      } : null
    }))
  });
}));

router.get('/topups', asyncHandler(async (req, res) => {
  const status = String(req.query.status || 'PENDING').trim().toUpperCase();
  const statuses = status === 'ALL' ? undefined : [status];
  const topups = await prisma.walletTransaction.findMany({
    where: {
      referenceType: { in: ['WALLET_TOPUP_REQUEST', 'RAZORPAY_WALLET_TOPUP'] },
      ...(statuses ? { status: { in: statuses } } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profiles: {
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { id: true, name: true, slug: true, status: true }
          },
          wallet: true
        }
      }
    }
  });

  res.json({
    data: topups.map((topup) => ({
      ...topup,
      user: topup.user ? {
        ...topup.user,
        wallet: topup.user.wallet ? {
          ...topup.user.wallet,
          availableBalance: walletAvailable(topup.user.wallet)
        } : null
      } : null
    }))
  });
}));

router.post('/wallets/:userId/credit', asyncHandler(async (req, res) => {
  const owner = await prisma.user.findFirst({
    where: { id: req.params.userId, role: 'OWNER' },
    select: { id: true, name: true, email: true }
  });
  if (!owner) return res.status(404).json({ error: 'Owner account not found.' });

  const amount = normalizeAmount(req.body.amount);
  if (amount <= 0) return res.status(400).json({ error: 'Wallet credit amount must be greater than zero.' });
  const currency = normalizeBillingCurrency(req.body.currency);
  const reason = String(req.body.reason || '').trim() || 'Admin featured wallet top-up';

  const result = await prisma.$transaction(async (tx) => {
    await getOrCreateWallet(tx, owner.id, currency);
    return creditWallet(tx, {
      userId: owner.id,
      amount,
      currency,
      reason,
      adminUserId: req.adminUser?.id,
      referenceType: 'ADMIN_WALLET_TOPUP',
      metadata: { ownerEmail: owner.email }
    });
  });

  res.json({
    data: {
      owner,
      wallet: {
        ...result.wallet,
        availableBalance: walletAvailable(result.wallet)
      },
      transaction: result.transaction
    }
  });
}));

router.patch('/topups/:transactionId/status', asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim().toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Valid top-up status is required.' });
  const existing = await prisma.walletTransaction.findFirst({
    where: {
      id: req.params.transactionId,
      referenceType: { in: ['WALLET_TOPUP_REQUEST', 'RAZORPAY_WALLET_TOPUP'] }
    },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  if (!existing) return res.status(404).json({ error: 'Wallet top-up request not found.' });
  if (existing.status !== 'PENDING') return res.status(400).json({ error: 'Only pending top-up requests can be updated.' });
  if (existing.referenceType === 'RAZORPAY_WALLET_TOPUP' && status === 'APPROVED') {
    return res.status(400).json({ error: 'Razorpay wallet top-ups must be completed by payment verification.' });
  }

  const adminNote = String(req.body.adminNote || '').trim();
  const result = await prisma.$transaction(async (tx) => {
    let credit = null;
    if (status === 'APPROVED') {
      credit = await creditWallet(tx, {
        userId: existing.userId,
        amount: existing.amount,
        currency: existing.currency,
        reason: adminNote || existing.reason || 'Approved wallet top-up request',
        adminUserId: req.adminUser?.id,
        referenceType: 'WALLET_TOPUP_REQUEST',
        referenceId: existing.id,
        metadata: {
          sourceTransactionId: existing.id,
          ownerEmail: existing.user?.email
        }
      });
    }
    const transaction = await tx.walletTransaction.update({
      where: { id: existing.id },
      data: {
        status,
        reason: adminNote || existing.reason,
        adminUserId: req.adminUser?.id || null,
        metadata: {
          ...(existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
          reviewedAt: new Date().toISOString(),
          reviewedBy: req.adminUser?.id || null,
          creditTransactionId: credit?.transaction?.id || null
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            wallet: true
          }
        }
      }
    });
    return { transaction, credit };
  });

  res.json({
    message: status === 'APPROVED' ? 'Wallet top-up approved and balance added.' : 'Wallet top-up request rejected.',
    data: {
      transaction: {
        ...result.transaction,
        user: result.transaction.user ? {
          ...result.transaction.user,
          wallet: result.transaction.user.wallet ? {
            ...result.transaction.user.wallet,
            availableBalance: walletAvailable(result.transaction.user.wallet)
          } : null
        } : null
      },
      credit: result.credit
    }
  });
}));

export default router;
