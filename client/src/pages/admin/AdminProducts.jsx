
import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'

import {
  useGetAdminProductsQuery,
  useGetAdminCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeactivateProductMutation,
  useActivateProductMutation,
} from '../../services/api'

// ---------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  category: '',
  categories: [],
  sku: '',
  price: '',
  stock: '',
  imageUrl: '',
}

function createSlug(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getId(value) {
  if (value && typeof value === 'object') {
    return String(value._id ?? value.id ?? '')
  }

  return String(value ?? '')
}

function getCategoryName(category, categories = []) {
  if (category && typeof category === 'object') {
    return category.name ?? 'Uncategorised'
  }

  const id = getId(category)

  const match = categories.find(
    (item) => getId(item) === id,
  )

  return match?.name ?? 'Uncategorised'
}

function getErrorMessage(error) {
  return (
    error?.data?.message ||
    error?.data?.error ||
    error?.error ||
    error?.message ||
    'Something went wrong. Please try again.'
  )
}

function formatPrice(priceMinor) {
  const amount = Number(priceMinor)

  if (!Number.isFinite(amount)) {
    return '—'
  }

  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

function getInitialForm(product) {
  if (!product) {
    return { ...EMPTY_FORM, categories: [] }
  }

  const primaryCategoryId = getId(product.category)

  const existingCategoryIds = Array.isArray(product.categories)
    ? product.categories.map(getId).filter(Boolean)
    : []

  return {
    name: product.name ?? '',
    slug: product.slug ?? '',
    description: product.description ?? '',
    category: primaryCategoryId,
    categories: [
      ...new Set(
        existingCategoryIds
          .filter((id) => id !== primaryCategoryId)
          .map(String),
      ),
    ],
    sku: product.sku ?? '',
    price:
      product.priceMinor != null
        ? String(Number(product.priceMinor) / 100)
        : '',
    stock:
      product.stock != null
        ? String(product.stock)
        : '',
    imageUrl: product.images?.[0] ?? '',
  }
}

function isPrimaryAdministrator(user) {
  return (
    user?.isPrimaryAdmin === true ||
    user?.isPrimary === true
  )
}

function hasPermission(user, permission) {
  if (isPrimaryAdministrator(user)) {
    return true
  }

  return (
    Array.isArray(user?.permissions) &&
    user.permissions.includes(permission)
  )
}

// ---------------------------------------------------------
// Product form
// ---------------------------------------------------------

function ProductFormFields({
  form,
  setForm,
  categories,
  slugManuallyEdited,
  setSlugManuallyEdited,
}) {
  const additionalCategories = form.categories ?? []

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleAdditionalCategoriesChange = (value) => {
    const selectedIds = Array.isArray(value) ? value : []

    setForm((previous) => ({
      ...previous,
      categories: [
        ...new Set(
          selectedIds
            .map(getId)
            .filter(
              (id) =>
                id &&
                id !== getId(previous.category),
            ),
        ),
      ],
    }))
  }

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      <TextField
        label="Product name"
        value={form.name}
        onChange={(event) => {
          const name = event.target.value

          setForm((previous) => ({
            ...previous,
            name,
            ...(slugManuallyEdited
              ? {}
              : { slug: createSlug(name) }),
          }))
        }}
        required
        fullWidth
        autoFocus
      />

      <TextField
        label="Product slug"
        value={form.slug}
        onChange={(event) => {
          setSlugManuallyEdited(true)
          updateField('slug', createSlug(event.target.value))
        }}
        helperText="Used in product URLs. Use lowercase letters, numbers and hyphens."
        required
        fullWidth
      />

      <TextField
        label="Description"
        value={form.description}
        onChange={(event) =>
          updateField('description', event.target.value)
        }
        multiline
        minRows={3}
        required
        fullWidth
      />

      <Divider />

      <Typography variant="subtitle2" color="text.secondary">
        Product categories
      </Typography>

      <TextField
        select
        label="Primary category"
        value={form.category}
        onChange={(event) => {
          const primaryId = event.target.value

          setForm((previous) => ({
            ...previous,
            category: primaryId,
            categories: previous.categories.filter(
              (id) => getId(id) !== getId(primaryId),
            ),
          }))
        }}
        required
        fullWidth
        helperText="Choose the main category for this product."
      >
        {categories.map((category) => (
          <MenuItem
            key={category._id}
            value={getId(category)}
          >
            {category.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Additional categories"
        value={additionalCategories}
        onChange={(event) =>
          handleAdditionalCategoriesChange(event.target.value)
        }
        fullWidth
        helperText="Optional. Select additional categories for this product."
        slotProps={{
          select: {
            multiple: true,
            renderValue: (selected) =>
              categories
                .filter((category) =>
                  selected.some(
                    (id) => getId(id) === getId(category),
                  ),
                )
                .map((category) => category.name)
                .join(', '),
          },
        }}
      >
        {categories
          .filter(
            (category) =>
              getId(category) !== getId(form.category),
          )
          .map((category) => (
            <MenuItem
              key={category._id}
              value={getId(category)}
            >
              <Checkbox
                checked={additionalCategories.some(
                  (id) => getId(id) === getId(category),
                )}
                size="small"
              />
              <ListItemText primary={category.name} />
            </MenuItem>
          ))}
      </TextField>

      <Divider />

      <Typography variant="subtitle2" color="text.secondary">
        Pricing and inventory
      </Typography>

      <TextField
        label="SKU"
        value={form.sku}
        onChange={(event) =>
          updateField('sku', event.target.value.toUpperCase())
        }
        required
        fullWidth
        helperText="Must be unique if enforced by your backend."
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
      >
        <TextField
          label="Price (KES)"
          type="number"
          value={form.price}
          onChange={(event) =>
            updateField('price', event.target.value)
          }
          required
          fullWidth
          slotProps={{
            htmlInput: {
              min: 0,
              step: '0.01',
            },
          }}
        />

        <TextField
          label="Stock quantity"
          type="number"
          value={form.stock}
          onChange={(event) =>
            updateField('stock', event.target.value)
          }
          required
          fullWidth
          slotProps={{
            htmlInput: {
              min: 0,
              step: 1,
            },
          }}
        />
      </Stack>

      <Divider />

      <Typography variant="subtitle2" color="text.secondary">
        Product image
      </Typography>

      <TextField
        label="Image URL"
        value={form.imageUrl}
        onChange={(event) =>
          updateField('imageUrl', event.target.value)
        }
        fullWidth
        placeholder="https://example.com/product-image.jpg"
        helperText="Use a publicly accessible image URL."
        slotProps={{
          htmlInput: {
            type: 'url',
          },
        }}
      />

      {form.imageUrl.trim() && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
          }}
        >
          <Box
            component="img"
            src={form.imageUrl.trim()}
            alt="Product preview"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden'
            }}
            onLoad={(event) => {
              event.currentTarget.style.visibility = 'visible'
            }}
            sx={{
              width: 72,
              height: 72,
              objectFit: 'contain',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          />

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600}>
              Image preview
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ overflowWrap: 'anywhere' }}
            >
              {form.imageUrl}
            </Typography>
          </Box>
        </Box>
      )}
    </Stack>
  )
}

// ---------------------------------------------------------
// Main page
// ---------------------------------------------------------

export default function AdminProducts({ user }) {
  // Search and filters
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [categorySlug, setCategorySlug] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productToDeactivate, setProductToDeactivate] = useState(null)
  const [productToActivate, setProductToActivate] = useState(null)

  // Independent create and edit forms
  const [createForm, setCreateForm] = useState({
    ...EMPTY_FORM,
    categories: [],
  })

  const [editForm, setEditForm] = useState({
    ...EMPTY_FORM,
    categories: [],
  })

  const [createSlugManuallyEdited, setCreateSlugManuallyEdited] =
    useState(false)

  const [editSlugManuallyEdited, setEditSlugManuallyEdited] =
    useState(false)

  const [notice, setNotice] = useState(null)

  // Queries
  const {
    data: productsResponse,
    isLoading: productsLoading,
    isFetching: productsFetching,
    error: productsError,
    refetch: refetchProducts,
  } = useGetAdminProductsQuery({
    page: page + 1,
    limit: rowsPerPage,
    search,
    status: status === 'all' ? undefined : status,
    category: categorySlug || undefined,
  })

  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetAdminCategoriesQuery()

  // Mutations
  const [createProduct, { isLoading: isCreating }] =
    useCreateProductMutation()

  const [updateProduct, { isLoading: isUpdating }] =
    useUpdateProductMutation()

  const [deactivateProduct, { isLoading: isDeactivating }] =
    useDeactivateProductMutation()

  const [activateProduct, { isLoading: isActivating }] =
    useActivateProductMutation()

  // Permissions
  const canCreateProducts = hasPermission(user, 'products.create')
  const canUpdateProducts = hasPermission(user, 'products.update')

  const canChangeProductStatus =
    hasPermission(user, 'products.deactivate') ||
    hasPermission(user, 'products.activate')

  const canManageProducts =
    canCreateProducts ||
    canUpdateProducts ||
    canChangeProductStatus

  // API response data
  const products = Array.isArray(productsResponse?.data)
    ? productsResponse.data
    : []

  const rawCategories = Array.isArray(categoriesResponse?.data)
    ? categoriesResponse.data
    : []

  // Do not show categories explicitly marked inactive.
  // The backend remains responsible for verifying category validity.
  const categories = useMemo(
    () =>
      rawCategories.filter(
        (category) =>
          category?._id &&
          category.isActive !== false,
      ),
    [rawCategories],
  )

  const categoryOptions = useMemo(
    () =>
      [...categories].sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? '')),
      ),
    [categories],
  )

  const totalProducts =
    productsResponse?.pagination?.total ??
    productsResponse?.total ??
    products.length

  const activeOnPage = products.filter(
    (product) => product.isActive !== false,
  ).length

  const inactiveOnPage = products.length - activeOnPage

  // -------------------------------------------------------
  // Search and filters
  // -------------------------------------------------------

  const handleSearch = (event) => {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(0)
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('all')
    setCategorySlug('')
    setPage(0)
  }

  // -------------------------------------------------------
  // Form validation and payload
  // -------------------------------------------------------

  const validateForm = (form) => {
    if (!form.name.trim()) {
      return 'Enter a product name.'
    }

    if (!createSlug(form.slug)) {
      return 'Enter a valid product slug.'
    }

    if (!form.description.trim()) {
      return 'Enter a product description.'
    }

    if (!form.category || !getId(form.category)) {
      return 'Choose a primary category.'
    }

    const selectedCategoryIds = [
      ...new Set(
        [
          getId(form.category),
          ...(form.categories ?? []).map(getId),
        ].filter(Boolean),
      ),
    ]

    const validCategoryIds = new Set(
      categories.map((category) => getId(category)),
    )

    const invalidCategoryIds = selectedCategoryIds.filter(
      (id) => !validCategoryIds.has(id),
    )

    if (invalidCategoryIds.length > 0) {
      return 'A selected category is no longer available. Refresh the page and choose an active category.'
    }

    if (!form.sku.trim()) {
      return 'Enter a product SKU.'
    }

    if (
      form.price === '' ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      return 'Enter a valid, non-negative product price.'
    }

    const priceMinor = Math.round(Number(form.price) * 100)

    if (!Number.isSafeInteger(priceMinor)) {
      return 'The price is too large.'
    }

    if (
      form.stock === '' ||
      !Number.isSafeInteger(Number(form.stock)) ||
      Number(form.stock) < 0
    ) {
      return 'Stock must be a whole number greater than or equal to zero.'
    }

    if (
      form.imageUrl.trim() &&
      !/^https?:\/\/\S+$/i.test(form.imageUrl.trim())
    ) {
      return 'Enter an image URL beginning with http:// or https://.'
    }

    return null
  }

  const buildPayload = (form) => {
    const primaryCategoryId = getId(form.category)

    const additionalCategoryIds = (form.categories ?? [])
      .map(getId)
      .filter(Boolean)

    // category is the primary category.
    // categories contains the primary category and any additional categories.
    const allCategoryIds = [
      ...new Set(
        [primaryCategoryId, ...additionalCategoryIds].filter(Boolean),
      ),
    ]

    return {
      name: form.name.trim(),
      slug: createSlug(form.slug),
      description: form.description.trim(),
      category: primaryCategoryId,
      categories: allCategoryIds,
      sku: form.sku.trim().toUpperCase(),
      priceMinor: Math.round(Number(form.price) * 100),
      stock: Number(form.stock),
      images: form.imageUrl.trim()
        ? [form.imageUrl.trim()]
        : [],
    }
  }

  // -------------------------------------------------------
  // Create product
  // -------------------------------------------------------

  const openCreateDialog = () => {
    setCreateForm({ ...EMPTY_FORM, categories: [] })
    setCreateSlugManuallyEdited(false)
    setCreateDialogOpen(true)
    setNotice(null)
  }

  const closeCreateDialog = () => {
    if (isCreating) return

    setCreateDialogOpen(false)
    setCreateForm({ ...EMPTY_FORM, categories: [] })
  }

  const handleCreateProduct = async (event) => {
    event.preventDefault()
    setNotice(null)

    const validationError = validateForm(createForm)

    if (validationError) {
      setNotice({
        type: 'error',
        message: validationError,
      })
      return
    }

    const payload = buildPayload(createForm)

    // Keep this log until product creation works correctly.
    console.log('Create product payload:', payload)

    try {
      await createProduct(payload).unwrap()

      setCreateDialogOpen(false)
      setCreateForm({ ...EMPTY_FORM, categories: [] })
      setCreateSlugManuallyEdited(false)
      setPage(0)

      setNotice({
        type: 'success',
        message: 'Product created successfully.',
      })
    } catch (error) {
      console.error(
        'Create product failed:',
        error?.status,
        error?.data ?? error,
      )

      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  // -------------------------------------------------------
  // Edit product
  // -------------------------------------------------------

  const openEditDialog = (product) => {
    setEditingProduct(product)
    setEditForm(getInitialForm(product))
    setEditSlugManuallyEdited(true)
    setNotice(null)
  }

  const closeEditDialog = () => {
    if (isUpdating) return

    setEditingProduct(null)
    setEditForm({ ...EMPTY_FORM, categories: [] })
  }

  const handleUpdateProduct = async (event) => {
    event.preventDefault()
    setNotice(null)

    const validationError = validateForm(editForm)

    if (validationError) {
      setNotice({
        type: 'error',
        message: validationError,
      })
      return
    }

    try {
      const payload = buildPayload(editForm)

      await updateProduct({
        id: editingProduct._id,
        ...payload,
      }).unwrap()

      setEditingProduct(null)
      setEditForm({ ...EMPTY_FORM, categories: [] })

      setNotice({
        type: 'success',
        message: 'Product updated successfully.',
      })
    } catch (error) {
      console.error(
        'Update product failed:',
        error?.status,
        error?.data ?? error,
      )

      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  // -------------------------------------------------------
  // Activate and deactivate
  // -------------------------------------------------------

  const handleDeactivateProduct = async () => {
    if (!productToDeactivate) return

    setNotice(null)

    try {
      // api.js expects the ID itself, not { id: ... }.
      await deactivateProduct(productToDeactivate._id).unwrap()

      setNotice({
        type: 'success',
        message: `"${productToDeactivate.name}" was deactivated.`,
      })

      setProductToDeactivate(null)
    } catch (error) {
      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  const handleActivateProduct = async () => {
    if (!productToActivate) return

    setNotice(null)

    try {
      // api.js expects the ID itself, not { id: ... }.
      await activateProduct(productToActivate._id).unwrap()

      setNotice({
        type: 'success',
        message: `"${productToActivate.name}" was activated.`,
      })

      setProductToActivate(null)
    } catch (error) {
      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      })
    }
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <Stack spacing={3}>
      {/* Page heading */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Products
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your marketplace catalogue, pricing and inventory.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh products">
            <span>
              <IconButton
                onClick={() => refetchProducts()}
                disabled={productsFetching}
                aria-label="Refresh products"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                {productsFetching ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>

          {canCreateProducts && (
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              onClick={openCreateDialog}
              sx={{
                borderRadius: 2,
                whiteSpace: 'nowrap',
              }}
            >
              Add product
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Notices */}
      {notice && (
        <Alert
          severity={notice.type}
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {productsError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => refetchProducts()}
            >
              Retry
            </Button>
          }
        >
          {getErrorMessage(productsError)}
        </Alert>
      )}

      {categoriesError && (
        <Alert severity="error">
          Categories could not be loaded. Check the category API before
          creating or editing products.
        </Alert>
      )}

      {/* Summary cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {[
          {
            label: 'Matching products',
            value: totalProducts,
            description: 'Products matching your current filters',
          },
          {
            label: 'Active on this page',
            value: activeOnPage,
            description: 'Currently available to customers',
          },
          {
            label: 'Inactive on this page',
            value: inactiveOnPage,
            description: 'Currently unavailable to customers',
          },
        ].map((item) => (
          <Paper
            key={item.label}
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 3 }}
          >
            <Typography variant="body2" color="text.secondary">
              {item.label}
            </Typography>

            <Typography variant="h4" fontWeight={700} sx={{ my: 1 }}>
              {item.value}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {item.description}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Search and filters */}
      <Paper
        component="form"
        onSubmit={handleSearch}
        variant="outlined"
        sx={{ p: 2, borderRadius: 3 }}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Find products
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(220px, 2fr) repeat(2, minmax(160px, 1fr)) auto',
              },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              label="Search products"
              placeholder="Name, slug or SKU"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              fullWidth
            />

            <TextField
              select
              size="small"
              label="Status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(0)
              }}
              fullWidth
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Category"
              value={categorySlug}
              onChange={(event) => {
                setCategorySlug(event.target.value)
                setPage(0)
              }}
              fullWidth
            >
              <MenuItem value="">All categories</MenuItem>

              {categoryOptions.map((category) => (
                <MenuItem
                  key={category._id}
                  value={category.slug}
                >
                  {category.name}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained">
                Search
              </Button>

              <Button
                type="button"
                color="inherit"
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Product table */}
      <Paper
        variant="outlined"
        sx={{ borderRadius: 3, overflow: 'hidden' }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Product catalogue
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Review and manage your listed products.
            </Typography>
          </Box>

          {productsFetching && !productsLoading && (
            <CircularProgress size={22} />
          )}
        </Box>

        <Divider />

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell>Status</TableCell>

                {canManageProducts && (
                  <TableCell align="right">Actions</TableCell>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {productsLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={canManageProducts ? 7 : 6}
                    align="center"
                    sx={{ py: 7 }}
                  >
                    <CircularProgress size={30} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1.5 }}
                    >
                      Loading products...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManageProducts ? 7 : 6}
                    align="center"
                    sx={{ py: 7 }}
                  >
                    <ImageOutlinedIcon
                      sx={{
                        fontSize: 42,
                        color: 'text.disabled',
                      }}
                    />

                    <Typography fontWeight={600} sx={{ mt: 1 }}>
                      No products found
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Try changing your search or filters.
                    </Typography>

                    {(search || status !== 'all' || categorySlug) && (
                      <Button
                        size="small"
                        onClick={handleClearFilters}
                        sx={{ mt: 1 }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const isActive = product.isActive !== false

                  const primaryCategory = getCategoryName(
                    product.category,
                    rawCategories,
                  )

                  const additionalCategoryNames = Array.isArray(
                    product.categories,
                  )
                    ? [
                        ...new Set(
                          product.categories
                            .map((category) =>
                              getCategoryName(category, rawCategories),
                            )
                            .filter(
                              (name) =>
                                name !== 'Uncategorised' &&
                                name !== primaryCategory,
                            ),
                        ),
                      ]
                    : []

                  return (
                    <TableRow
                      key={product._id}
                      hover
                      sx={{
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              flexShrink: 0,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 2,
                              bgcolor: 'action.hover',
                              overflow: 'hidden',
                            }}
                          >
                            {product.images?.[0] ? (
                              <Box
                                component="img"
                                src={product.images[0]}
                                alt={product.name}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                }}
                              />
                            ) : (
                              <ImageOutlinedIcon
                                color="disabled"
                                fontSize="small"
                              />
                            )}
                          </Box>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ overflowWrap: 'anywhere' }}
                            >
                              {product.name}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ overflowWrap: 'anywhere' }}
                            >
                              {product.slug}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {product.sku || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 150 }}>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          useFlexGap
                          flexWrap="wrap"
                        >
                          <Chip
                            label={primaryCategory}
                            size="small"
                            variant="outlined"
                          />

                          {additionalCategoryNames.map((name) => (
                            <Chip
                              key={name}
                              label={name}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                        </Stack>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {formatPrice(product.priceMinor)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={
                            Number(product.stock) <= 5
                              ? 'error.main'
                              : 'text.primary'
                          }
                        >
                          {product.stock ?? 0}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={isActive ? 'Active' : 'Inactive'}
                          color={isActive ? 'success' : 'default'}
                          size="small"
                          variant={isActive ? 'filled' : 'outlined'}
                        />
                      </TableCell>

                      {canManageProducts && (
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="flex-end"
                          >
                            {canUpdateProducts && (
                              <Tooltip title="Edit product">
                                <IconButton
                                  size="small"
                                  onClick={() => openEditDialog(product)}
                                  aria-label={`Edit ${product.name}`}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {canChangeProductStatus &&
                              (isActive ? (
                                <Tooltip title="Deactivate product">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      setProductToDeactivate(product)
                                    }
                                    aria-label={`Deactivate ${product.name}`}
                                  >
                                    <BlockOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Activate product">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() =>
                                      setProductToActivate(product)
                                    }
                                    aria-label={`Activate ${product.name}`}
                                  >
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ))}
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />

        <TablePagination
          component="div"
          count={Number(totalProducts) || 0}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          showFirstButton
          showLastButton
        />
      </Paper>

      {/* Create product dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={closeCreateDialog}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <Box component="form" onSubmit={handleCreateProduct}>
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Add product
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Add a new item to your catalogue.
              </Typography>
            </Box>

            <IconButton
              onClick={closeCreateDialog}
              disabled={isCreating}
              aria-label="Close create product dialog"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <Divider />

          <DialogContent>
            {categoriesLoading ? (
              <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
                <CircularProgress size={28} />

                <Typography variant="body2" color="text.secondary">
                  Loading categories...
                </Typography>
              </Stack>
            ) : categoriesError ? (
              <Alert severity="error">
                Categories could not be loaded. Try refreshing the page.
              </Alert>
            ) : categories.length === 0 ? (
              <Alert severity="warning">
                No active categories are available. Create or activate a
                category before adding a product.
              </Alert>
            ) : (
              <ProductFormFields
                form={createForm}
                setForm={setCreateForm}
                categories={categoryOptions}
                slugManuallyEdited={createSlugManuallyEdited}
                setSlugManuallyEdited={setCreateSlugManuallyEdited}
              />
            )}
          </DialogContent>

          <Divider />

          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={closeCreateDialog}
              color="inherit"
              disabled={isCreating}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={
                isCreating ||
                categoriesLoading ||
                categoriesError ||
                categories.length === 0
              }
              startIcon={
                isCreating ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AddOutlinedIcon />
                )
              }
            >
              {isCreating ? 'Creating...' : 'Create product'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit product dialog */}
      <Dialog
        open={Boolean(editingProduct)}
        onClose={closeEditDialog}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <Box component="form" onSubmit={handleUpdateProduct}>
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Edit product
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Update product details and inventory.
              </Typography>
            </Box>

            <IconButton
              onClick={closeEditDialog}
              disabled={isUpdating}
              aria-label="Close edit product dialog"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <Divider />

          <DialogContent>
            {categoriesLoading ? (
              <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
                <CircularProgress size={28} />

                <Typography variant="body2" color="text.secondary">
                  Loading categories...
                </Typography>
              </Stack>
            ) : categoriesError ? (
              <Alert severity="error">
                Categories could not be loaded. Try refreshing the page.
              </Alert>
            ) : categories.length === 0 ? (
              <Alert severity="warning">
                No active categories are available.
              </Alert>
            ) : (
              <ProductFormFields
                form={editForm}
                setForm={setEditForm}
                categories={categoryOptions}
                slugManuallyEdited={editSlugManuallyEdited}
                setSlugManuallyEdited={setEditSlugManuallyEdited}
              />
            )}
          </DialogContent>

          <Divider />

          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={closeEditDialog}
              color="inherit"
              disabled={isUpdating}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={
                isUpdating ||
                categoriesLoading ||
                categoriesError ||
                categories.length === 0
              }
              startIcon={
                isUpdating ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <EditOutlinedIcon />
                )
              }
            >
              {isUpdating ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Deactivate confirmation */}
      <Dialog
        open={Boolean(productToDeactivate)}
        onClose={() => {
          if (!isDeactivating) {
            setProductToDeactivate(null)
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Deactivate product?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {`"${productToDeactivate?.name ?? 'This product'}" will no longer be available to customers while inactive. You can activate it again later.`}
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            color="inherit"
            onClick={() => setProductToDeactivate(null)}
            disabled={isDeactivating}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleDeactivateProduct}
            disabled={isDeactivating}
          >
            {isDeactivating ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activate confirmation */}
      <Dialog
        open={Boolean(productToActivate)}
        onClose={() => {
          if (!isActivating) {
            setProductToActivate(null)
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Activate product?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {`"${productToActivate?.name ?? 'This product'}" will become active and may be visible to customers again.`}
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            color="inherit"
            onClick={() => setProductToActivate(null)}
            disabled={isActivating}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="success"
            onClick={handleActivateProduct}
            disabled={isActivating}
          >
            {isActivating ? 'Activating...' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
