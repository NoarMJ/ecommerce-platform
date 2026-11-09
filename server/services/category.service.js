const categoryRepository = require('../repositories/category.repository');
const productRepository = require('../repositories/product.repository');
const AppError = require('../utils/AppError');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const assertValidId = (id) => {
  if (!UUID_REGEX.test(id)) {
    throw new AppError('Invalid category ID.', 400);
  }
};

const cleanText = (value) =>
  typeof value === 'string' ? value.trim() : undefined;

// Turn Prisma's database errors into errors our API understands
const translateDbError = (error) => {
  if (error.code === 'P2002') {
    throw new AppError('A category with this slug already exists.', 409);
  }
  if (error.code === 'P2025') {
    throw new AppError('Category not found.', 404);
  }
  throw error;
};

const getPublicCategories = () =>
  categoryRepository.findAll({ onlyActive: true });

const getAdminCategories = () => categoryRepository.findAll();

const createCategory = async ({ name, slug, description, image } = {}) => {
  const cleanName = cleanText(name);
  const cleanSlug = cleanText(slug)?.toLowerCase();

  if (!cleanName || !cleanSlug) {
    throw new AppError('Category name and slug are required.', 400);
  }
  if (cleanName.length > 100) {
    throw new AppError('Category name cannot exceed 100 characters.', 400);
  }

  try {
    return await categoryRepository.create({
      name: cleanName,
      slug: cleanSlug,
      description: cleanText(description),
      image: cleanText(image),
    });
  } catch (error) {
    return translateDbError(error);
  }
};

const updateCategory = async (id, body = {}) => {
  assertValidId(id);

  const updates = {};
  for (const field of ['name', 'slug', 'description', 'image']) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('Provide at least one field to update.', 400);
  }

  if (updates.name !== undefined) {
    const name = cleanText(updates.name);
    if (!name) throw new AppError('Category name cannot be empty.', 400);
    if (name.length > 100) {
      throw new AppError('Category name cannot exceed 100 characters.', 400);
    }
    updates.name = name;
  }

  if (updates.slug !== undefined) {
    const slug = cleanText(updates.slug)?.toLowerCase();
    if (!slug) throw new AppError('Category slug cannot be empty.', 400);
    updates.slug = slug;
  }

  for (const field of ['description', 'image']) {
    if (updates[field] !== undefined) {
      if (typeof updates[field] !== 'string') {
        throw new AppError(`Category ${field} must be text.`, 400);
      }
      updates[field] = updates[field].trim();
    }
  }

  try {
    return await categoryRepository.update(id, updates);
  } catch (error) {
    return translateDbError(error);
  }
};

const deactivateCategory = async (id) => {
  assertValidId(id);

  const category = await categoryRepository.findById(id);
  if (!category || !category.isActive) {
    throw new AppError('Active category not found.', 404);
  }

  const hasActiveProducts = await productRepository.existsActiveInCategory(id);
  if (hasActiveProducts) {
    throw new AppError(
      'Cannot deactivate a category that has active products.',
      409
    );
  }

  return categoryRepository.update(id, { isActive: false });
};

const activateCategory = async (id) => {
  assertValidId(id);

  try {
    return await categoryRepository.update(id, { isActive: true });
  } catch (error) {
    return translateDbError(error);
  }
};

module.exports = {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
};