const sellerRepository = require('../repositories/seller.repository');
const AppError = require('../utils/AppError');

const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The only legal status moves. Anything else is refused with a 409.
const TRANSITIONS = {
  approve: { from: ['pending'], to: 'approved' },
  reject: { from: ['pending'], to: 'rejected' },
  suspend: { from: ['approved'], to: 'suspended' },
  reactivate: { from: ['suspended'], to: 'approved' },
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');

function validationError(details) {
  const error = new AppError('Validation failed.', 400);
  error.details = details;
  return error;
}

// A malformed id would make Prisma throw a 500, so treat it as "not found".
function assertSellerId(id) {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new AppError('Seller not found.', 404);
  }
}

function toAdminView(profile) {
  return {
    id: profile.id,
    accountType: profile.accountType,
    dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
    shopName: profile.shopName,
    companyName: profile.companyName,
    county: profile.county,
    town: profile.town,
    description: profile.description,
    status: profile.status,
    submittedAt: profile.submittedAt,
    reviewedAt: profile.reviewedAt,
    reviewedById: profile.reviewedById,
    rejectionReason: profile.rejectionReason,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    applicant: profile.user || null,
  };
}

async function listSellers(query = {}) {
  const status = text(query.status) || undefined;
  if (status && !STATUSES.includes(status)) {
    throw new AppError('Invalid status filter.', 400);
  }

  const search = text(query.search).slice(0, 100) || undefined;
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [rows, total] = await sellerRepository.listForAdmin({
    status,
    search,
    skip: (page - 1) * limit,
    take: limit,
    // Review queue: oldest pending first. Everything else: newest first.
    sortDirection: status === 'pending' ? 'asc' : 'desc',
  });

  return {
    sellers: rows.map(toAdminView),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getSeller(id) {
  assertSellerId(id);

  const profile = await sellerRepository.findByIdWithUser(id);
  if (!profile) throw new AppError('Seller not found.', 404);

  return toAdminView(profile);
}

function parseRejectionReason(input) {
  const body = input && typeof input === 'object' ? input : {};
  const reason = text(body.reason);

  if (reason.length < 3 || reason.length > 500) {
    throw validationError({ reason: 'Give a reason of 3-500 characters.' });
  }

  return reason;
}

async function reviewSeller(adminId, sellerId, action, input) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new AppError('Unknown review action.', 400);

  assertSellerId(sellerId);

  const profile = await sellerRepository.findByIdWithUser(sellerId);
  if (!profile) throw new AppError('Seller not found.', 404);

  if (profile.userId === adminId) {
    throw new AppError('You cannot review your own seller application.', 403);
  }

  if (!rule.from.includes(profile.status)) {
    throw new AppError(
      `Cannot ${action} a seller whose status is "${profile.status}".`,
      409
    );
  }

  const data = {
    status: rule.to,
    reviewedAt: new Date(),
    reviewedById: adminId,
    rejectionReason: action === 'reject' ? parseRejectionReason(input) : null,
  };

  const result = await sellerRepository.transitionStatus(
    sellerId,
    rule.from,
    data
  );

  if (result.count === 0) {
    throw new AppError(
      'This seller was updated by someone else. Refresh and try again.',
      409
    );
  }

  return toAdminView(await sellerRepository.findByIdWithUser(sellerId));
}

module.exports = { listSellers, getSeller, reviewSeller };