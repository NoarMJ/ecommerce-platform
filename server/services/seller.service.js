const sellerRepository = require('../repositories/seller.repository');
const AppError = require('../utils/AppError');

const MIN_AGE = 18;
const MAX_AGE = 120;
const ACCOUNT_TYPES = ['individual', 'company'];

const APPLICATION_FIELDS = [
  'accountType',
  'dateOfBirth',
  'shopName',
  'companyName',
  'county',
  'town',
  'description',
];

const APPROVED_EDITABLE_FIELDS = ['county', 'town', 'description'];

const text = (value) =>
  typeof value === 'string' ? value.trim() : '';

function validationError(details) {
  const error = new AppError('Validation failed.', 400);
  error.details = details;
  return error;
}

function parseDateOfBirth(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  // Reject invalid dates that JavaScript would otherwise roll forward.
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function ageOn(dateOfBirth, today = new Date()) {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();

  const birthdayHasNotOccurred =
    today.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (
      today.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      today.getUTCDate() < dateOfBirth.getUTCDate()
    );

  if (birthdayHasNotOccurred) age -= 1;

  return age;
}

function validate(input, fields) {
  const body =
    input && typeof input === 'object' && !Array.isArray(input)
      ? input
      : {};

  const data = {};
  const errors = {};
  const includes = (field) => fields.includes(field);

  if (includes('accountType')) {
    if (ACCOUNT_TYPES.includes(body.accountType)) {
      data.accountType = body.accountType;
    } else {
      errors.accountType = 'Choose "individual" or "company".';
    }
  }

  if (includes('dateOfBirth')) {
    const dateOfBirth = parseDateOfBirth(body.dateOfBirth);

    if (!dateOfBirth) {
      errors.dateOfBirth = 'Use a valid date in YYYY-MM-DD format.';
    } else {
      const age = ageOn(dateOfBirth);

      if (age < MIN_AGE) {
        errors.dateOfBirth = `You must be at least ${MIN_AGE} years old.`;
      } else if (age > MAX_AGE) {
        errors.dateOfBirth = 'Enter a valid date of birth.';
      } else {
        data.dateOfBirth = dateOfBirth;
      }
    }
  }

  if (includes('shopName')) {
    const shopName = text(body.shopName);

    if (shopName.length < 2 || shopName.length > 120) {
      errors.shopName = 'Shop name must be 2–120 characters.';
    } else {
      data.shopName = shopName;
    }
  }

  if (includes('companyName')) {
    const companyName = text(body.companyName);

    if (data.accountType === 'company') {
      if (companyName.length < 2 || companyName.length > 150) {
        errors.companyName = 'Company name must be 2–150 characters.';
      } else {
        data.companyName = companyName;
      }
    } else {
      // Individual applications do not have a company name.
      data.companyName = null;
    }
  }

  for (const [field, label] of [
    ['county', 'County'],
    ['town', 'Town'],
  ]) {
    if (!includes(field)) continue;

    const value = text(body[field]);

    if (value.length < 2 || value.length > 100) {
      errors[field] = `${label} must be 2–100 characters.`;
    } else {
      data[field] = value;
    }
  }

  if (includes('description')) {
    const description = text(body.description);

    if (description.length > 1000) {
      errors.description = 'Description must be 1000 characters or fewer.';
    } else {
      data.description = description;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  return data;
}

function toApplicantView(profile) {
  if (!profile) return null;

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
    rejectionReason:
      profile.status === 'rejected' ? profile.rejectionReason : null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function submitApplication(userId, input) {
  const data = validate(input, APPLICATION_FIELDS);

  try {
    const profile = await sellerRepository.create({
      ...data,
      userId,
      // Do not accept seller status from the request.
      status: 'pending',
    });

    return toApplicantView(profile);
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('You already have a seller application.', 409);
    }

    throw error;
  }
}

async function getMyApplication(userId) {
  const profile = await sellerRepository.findByUserId(userId);
  return toApplicantView(profile);
}

async function updateMyApplication(userId, input) {
  const profile = await sellerRepository.findByUserId(userId);

  if (!profile) {
    throw new AppError('No seller application found.', 404);
  }

  let data;
  let allowedStatuses;

  if (profile.status === 'pending') {
    // PUT replaces the pending application fields, so send the full form.
    data = validate(input, APPLICATION_FIELDS);
    allowedStatuses = ['pending'];
  } else if (profile.status === 'approved') {
    data = validate(input, APPROVED_EDITABLE_FIELDS);
    allowedStatuses = ['approved'];

    if (Object.keys(data).length === 0) {
      throw new AppError('Provide at least one editable field.', 400);
    }
  } else if (profile.status === 'rejected') {
    throw new AppError('Rejected applications must be resubmitted.', 409);
  } else {
    throw new AppError(
      'Suspended accounts cannot be edited. Contact support.',
      409
    );
  }

  const result = await sellerRepository.updateIfStatus(
    userId,
    allowedStatuses,
    data
  );

  if (result.count === 0) {
    throw new AppError(
      'Your application status changed. Refresh and try again.',
      409
    );
  }

  return toApplicantView(
    await sellerRepository.findByUserId(userId)
  );
}

async function resubmitApplication(userId, input) {
  const data = validate(input, APPLICATION_FIELDS);

  const result = await sellerRepository.updateIfStatus(userId, ['rejected'], {
    ...data,
    status: 'pending',
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedById: null,
    rejectionReason: null,
  });

  if (result.count === 0) {
    const profile = await sellerRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError('No seller application found.', 404);
    }

    throw new AppError('Only rejected applications can be resubmitted.', 409);
  }

  return toApplicantView(
    await sellerRepository.findByUserId(userId)
  );
}

module.exports = {
  submitApplication,
  getMyApplication,
  updateMyApplication,
  resubmitApplication,
};