
import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SearchIcon from '@mui/icons-material/Search'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'

import {
  useGetAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeactivateCategoryMutation,
  useActivateCategoryMutation,
} from '../../services/api'

const emptyForm = {
  name: '',
  slug: '',
  description: '',
}

function getErrorMessage(error, fallback) {
  return error?.data?.message || error?.error || fallback
}

export default function AdminCategories({ user }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState(null)
  const [categoryToDeactivate, setCategoryToDeactivate] = useState(null)
  const [categoryToActivate, setCategoryToActivate] = useState(null)

  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState(null)

  // IMPORTANT:
  // This admin endpoint must return BOTH active and inactive categories.
  // The public categories endpoint intentionally returns active categories only.
  const {
    data: response,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
  } = useGetAdminCategoriesQuery()

  const [
    createCategory,
    { isLoading: isCreating, error: createError },
  ] = useCreateCategoryMutation()

  const [
    updateCategory,
    { isLoading: isUpdating, error: updateError },
  ] = useUpdateCategoryMutation()

  const [
    deactivateCategory,
    { isLoading: isDeactivating, error: deactivateError },
  ] = useDeactivateCategoryMutation()

  const [
    activateCategory,
    { isLoading: isActivating, error: activateError },
  ] = useActivateCategoryMutation()

  const categories = response?.data ?? []

  // Keep these checks aligned with the user object returned by /api/auth/me.
  const isPrimaryAdmin =
    user?.isPrimaryAdmin === true ||
    user?.isPrimary === true

  const permissions = Array.isArray(user?.permissions)
    ? user.permissions
    : []

  const canCreate =
    isPrimaryAdmin || permissions.includes('categories.create')

  const canUpdate =
    isPrimaryAdmin || permissions.includes('categories.update')

  const canDeactivate =
    isPrimaryAdmin || permissions.includes('categories.deactivate')

  const canManage = canUpdate || canDeactivate

  const activeCount = categories.filter(
    (category) => category.isActive,
  ).length

  const inactiveCount = categories.length - activeCount

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase()

    return categories.filter((category) => {
      const searchableValues = [
        category.name,
        category.slug,
        category.description,
      ]

      const matchesSearch =
        !term ||
        searchableValues.some((value) =>
          String(value ?? '').toLowerCase().includes(term),
        )

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.isActive) ||
        (statusFilter === 'inactive' && !category.isActive)

      return matchesSearch && matchesStatus
    })
  }, [categories, search, statusFilter])

  const openCreateDialog = () => {
    setCategoryToEdit(null)
    setForm(emptyForm)
    setNotice(null)
    setDialogOpen(true)
  }

  const openEditDialog = (category) => {
    setCategoryToEdit(category)

    setForm({
      name: category.name ?? '',
      slug: category.slug ?? '',
      description: category.description ?? '',
    })

    setNotice(null)
    setDialogOpen(true)
  }

  const closeFormDialog = () => {
    if (isCreating || isUpdating) return

    setDialogOpen(false)
    setCategoryToEdit(null)
    setForm(emptyForm)
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      }

      // Automatically generate the slug while creating a category.
      // The slug remains editable by the administrator.
      if (name === 'name' && !categoryToEdit) {
        next.slug = value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setNotice(null)

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim(),
    }

    if (!payload.name || !payload.slug) {
      setNotice({
        severity: 'warning',
        message: 'Category name and slug are required.',
      })
      return
    }

    // Match the slug pattern used by the input field.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) {
      setNotice({
        severity: 'warning',
        message:
          'Use lowercase letters and numbers separated by single hyphens in the slug.',
      })
      return
    }

    try {
      if (categoryToEdit) {
        await updateCategory({
          id: categoryToEdit._id,
          ...payload,
        }).unwrap()

        setNotice({
          severity: 'success',
          message: 'Category updated successfully.',
        })
      } else {
        await createCategory(payload).unwrap()

        setNotice({
          severity: 'success',
          message: 'Category created successfully.',
        })
      }

      setDialogOpen(false)
      setCategoryToEdit(null)
      setForm(emptyForm)
    } catch (error) {
      setNotice({
        severity: 'error',
        message: getErrorMessage(
          error,
          'The category could not be saved.',
        ),
      })
    }
  }

  const handleDeactivate = async () => {
    if (!categoryToDeactivate) return

    setNotice(null)

    try {
      await deactivateCategory(categoryToDeactivate._id).unwrap()

      setCategoryToDeactivate(null)

      setNotice({
        severity: 'success',
        message: 'Category deactivated successfully.',
      })
    } catch (error) {
      setNotice({
        severity: 'error',
        message: getErrorMessage(
          error,
          'The category could not be deactivated.',
        ),
      })
    }
  }

  const handleActivate = async () => {
    if (!categoryToActivate) return

    setNotice(null)

    try {
      await activateCategory(categoryToActivate._id).unwrap()

      setCategoryToActivate(null)

      setNotice({
        severity: 'success',
        message: 'Category activated successfully.',
      })
    } catch (error) {
      setNotice({
        severity: 'error',
        message: getErrorMessage(
          error,
          'The category could not be activated.',
        ),
      })
    }
  }

  const closeDeactivateDialog = () => {
    if (!isDeactivating) {
      setCategoryToDeactivate(null)
    }
  }

  const closeActivateDialog = () => {
    if (!isActivating) {
      setCategoryToActivate(null)
    }
  }

  const mutationError =
    createError ||
    updateError ||
    deactivateError ||
    activateError

  return (
    <Stack spacing={3}>
      {/* Page heading */}
      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Category management
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 650 }}
            >
              Organise marketplace categories, update their details,
              and control whether customers can browse them.
            </Typography>
          </Box>

          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
            >
              Add category
            </Button>
          )}
        </Stack>
      </Box>

      {/* Feedback messages */}
      {notice && (
        <Alert
          severity={notice.severity}
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {loadError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Retry
            </Button>
          }
        >
          {getErrorMessage(
            loadError,
            'Could not load categories.',
          )}
        </Alert>
      )}

      {mutationError && !notice && (
        <Alert severity="error">
          {getErrorMessage(
            mutationError,
            'The requested operation failed.',
          )}
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
            label: 'Total categories',
            value: categories.length,
            description: 'All recorded categories',
            color: 'text.primary',
          },
          {
            label: 'Active categories',
            value: activeCount,
            description: 'Available on the storefront',
            color: 'success.main',
          },
          {
            label: 'Inactive categories',
            value: inactiveCount,
            description: 'Hidden from public listings',
            color: 'text.secondary',
          },
        ].map((item) => (
          <Paper
            key={item.label}
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              minWidth: 0,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {item.label}
            </Typography>

            <Typography
              variant="h4"
              fontWeight={800}
              sx={{ mt: 1, color: item.color }}
            >
              {item.value}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.75 }}
            >
              {item.description}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Search and filters */}
      <Paper
        variant="outlined"
        sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3 }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Categories
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Showing {filteredCategories.length} of {categories.length}
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={
              isFetching ? (
                <CircularProgress size={16} />
              ) : (
                <RefreshIcon />
              )
            }
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 1fr) 210px',
            },
            gap: 2,
            mt: 2.5,
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Search categories"
            placeholder="Search by name, slug or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            select
            fullWidth
            size="small"
            label="Category status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <MenuItem value="all">
              All categories ({categories.length})
            </MenuItem>

            <MenuItem value="active">
              Active ({activeCount})
            </MenuItem>

            <MenuItem value="inactive">
              Inactive ({inactiveCount})
            </MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Categories table */}
      <Paper
        variant="outlined"
        sx={{ borderRadius: 3, overflow: 'hidden' }}
      >
        {isLoading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', p: 6 }}>
            <CircularProgress />

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              Loading categories…
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>
                    Category
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800 }}>
                    Slug
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800 }}>
                    Description
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800 }}>
                    Status
                  </TableCell>

                  {canManage && (
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 800, minWidth: 125 }}
                    >
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow
                    key={category._id}
                    hover
                    sx={{
                      opacity: category.isActive ? 1 : 0.75,
                    }}
                  >
                    <TableCell sx={{ minWidth: 170 }}>
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CategoryOutlinedIcon
                            fontSize="small"
                            color="action"
                          />
                        </Box>

                        <Typography fontWeight={700}>
                          {category.name}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ minWidth: 150 }}>
                      <Typography
                        variant="body2"
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {category.slug}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 220, maxWidth: 360 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflowWrap: 'anywhere',
                          whiteSpace: 'normal',
                        }}
                      >
                        {category.description || 'No description'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={category.isActive ? 'Active' : 'Inactive'}
                        color={category.isActive ? 'success' : 'default'}
                        variant={category.isActive ? 'filled' : 'outlined'}
                      />
                    </TableCell>

                    {canManage && (
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="flex-end"
                        >
                          {canUpdate && (
                            <Tooltip title="Edit category">
                              <IconButton
                                size="small"
                                color="primary"
                                aria-label={`Edit ${category.name}`}
                                onClick={() => openEditDialog(category)}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {canUpdate && !category.isActive && (
                            <Tooltip title="Reactivate category">
                              <IconButton
                                size="small"
                                color="success"
                                aria-label={`Reactivate ${category.name}`}
                                disabled={isActivating}
                                onClick={() =>
                                  setCategoryToActivate(category)
                                }
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {canDeactivate && category.isActive && (
                            <Tooltip title="Deactivate category">
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`Deactivate ${category.name}`}
                                disabled={isDeactivating}
                                onClick={() =>
                                  setCategoryToDeactivate(category)
                                }
                              >
                                <BlockOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {!loadError && filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 5 : 4}
                      align="center"
                      sx={{ py: 7, px: 2 }}
                    >
                      <CategoryOutlinedIcon
                        sx={{
                          fontSize: 42,
                          color: 'text.disabled',
                          mb: 1,
                        }}
                      />

                      <Typography fontWeight={700}>
                        {categories.length === 0
                          ? 'No categories yet'
                          : 'No matching categories'}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.75, maxWidth: 400, mx: 'auto' }}
                      >
                        {categories.length === 0
                          ? 'Create a category to start organising your marketplace.'
                          : 'Try another search term or select a different status filter.'}
                      </Typography>

                      {canCreate && categories.length === 0 && (
                        <Button
                          sx={{ mt: 2 }}
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={openCreateDialog}
                        >
                          Add category
                        </Button>
                      )}

                      {(search || statusFilter !== 'all') && (
                        <Button
                          sx={{ mt: 2 }}
                          color="inherit"
                          onClick={() => {
                            setSearch('')
                            setStatusFilter('all')
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create and edit category dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeFormDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {categoryToEdit ? 'Edit category' : 'Add category'}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {categoryToEdit
                    ? 'Update the category information.'
                    : 'Create a new marketplace category.'}
                </Typography>
              </Box>

              <IconButton
                aria-label="Close dialog"
                onClick={closeFormDialog}
                disabled={isCreating || isUpdating}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {notice && (
                <Alert
                  severity={notice.severity}
                  onClose={() => setNotice(null)}
                >
                  {notice.message}
                </Alert>
              )}

              <TextField
                autoFocus
                required
                fullWidth
                label="Category name"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                slotProps={{
                  htmlInput: { maxLength: 100 },
                }}
              />

              <TextField
                required
                fullWidth
                label="URL slug"
                name="slug"
                value={form.slug}
                onChange={handleFormChange}
                helperText="Use lowercase letters, numbers and single hyphens."
                slotProps={{
                  htmlInput: {
                    maxLength: 120,
                    pattern: '[a-z0-9]+(?:-[a-z0-9]+)*',
                  },
                }}
              />

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Description"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                slotProps={{
                  htmlInput: { maxLength: 500 },
                }}
              />

              {(createError || updateError) && !notice && (
                <Alert severity="error">
                  {getErrorMessage(
                    createError || updateError,
                    'Could not save this category.',
                  )}
                </Alert>
              )}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={closeFormDialog}
              disabled={isCreating || isUpdating}
              color="inherit"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={isCreating || isUpdating}
            >
              {(isCreating || isUpdating) && (
                <CircularProgress size={18} sx={{ mr: 1 }} />
              )}

              {categoryToEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Deactivation confirmation */}
      <Dialog
        open={Boolean(categoryToDeactivate)}
        onClose={closeDeactivateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Deactivate category?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {`"${categoryToDeactivate?.name || ''}" will be marked inactive and hidden from public category listings. You can reactivate it later.`}
          </DialogContentText>

          {deactivateError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {getErrorMessage(
                deactivateError,
                'Could not deactivate this category.',
              )}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button
            color="inherit"
            onClick={closeDeactivateDialog}
            disabled={isDeactivating}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeactivate}
            disabled={isDeactivating}
          >
            {isDeactivating ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Deactivate'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reactivation confirmation */}
      <Dialog
        open={Boolean(categoryToActivate)}
        onClose={closeActivateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reactivate category?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {`"${categoryToActivate?.name || ''}" will become active and appear in public category listings again, subject to your backend's rules.`}
          </DialogContentText>

          {activateError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {getErrorMessage(
                activateError,
                'Could not activate this category.',
              )}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button
            color="inherit"
            onClick={closeActivateDialog}
            disabled={isActivating}
          >
            Cancel
          </Button>

          <Button
            color="success"
            variant="contained"
            onClick={handleActivate}
            disabled={isActivating}
          >
            {isActivating ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Activate category'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
