
import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import {
  useGetAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminPermissionsMutation,
} from '../../services/api'

const permissionGroups = {
  Products: [
    'products.create',
    'products.update',
    'products.deactivate',
  ],
  Categories: [
    'categories.create',
    'categories.update',
    'categories.deactivate',
  ],
  Orders: ['orders.read', 'orders.update'],
  Administration: ['users.manage', 'admins.create'],
}

const permissionLabels = {
  'products.create': 'Create products',
  'products.update': 'Update products',
  'products.deactivate': 'Deactivate products',
  'categories.create': 'Create categories',
  'categories.update': 'Update categories',
  'categories.deactivate': 'Deactivate categories',
  'orders.read': 'View orders',
  'orders.update': 'Update orders',
  'users.manage': 'Manage customers',
  'admins.create': 'Create and view administrators',
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
}

export default function AdminManagement({ user }) {
  const { data: response, isLoading, error } = useGetAdminsQuery()
  const [createAdmin, createState] = useCreateAdminMutation()
  const [updatePermissions, permissionState] =
    useUpdateAdminPermissionsMutation()

  const [form, setForm] = useState(emptyForm)
  const [selectedPermissions, setSelectedPermissions] = useState({})
  const [notice, setNotice] = useState(null)

  const admins = response?.data || []
  const canCreate =
    user?.isPrimaryAdmin ||
    user?.permissions?.includes('admins.create')

  const handleCreate = async (event) => {
    event.preventDefault()
    setNotice(null)

    try {
      await createAdmin(form).unwrap()
      setForm({ ...emptyForm })
      setNotice({
        type: 'success',
        text: 'Administrator account created.',
      })
    } catch (err) {
      setNotice({
        type: 'error',
        text: err?.data?.message || 'Could not create administrator.',
      })
    }
  }

  const togglePermission = (adminId, permission, checked) => {
    setSelectedPermissions((previous) => {
      const current =
        previous[adminId] ||
        admins.find((admin) => admin._id === adminId)?.permissions ||
        []

      return {
        ...previous,
        [adminId]: checked
          ? [...new Set([...current, permission])]
          : current.filter((item) => item !== permission),
      }
    })
  }

  const savePermissions = async (admin) => {
    setNotice(null)

    try {
      await updatePermissions({
        id: admin._id,
        permissions:
          selectedPermissions[admin._id] ?? admin.permissions ?? [],
      }).unwrap()

      setSelectedPermissions((previous) => {
        const next = { ...previous }
        delete next[admin._id]
        return next
      })

      setNotice({
        type: 'success',
        text: `Permissions updated for ${admin.email}.`,
      })
    } catch (err) {
      setNotice({
        type: 'error',
        text: err?.data?.message || 'Could not update permissions.',
      })
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Administrator management
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Create staff accounts and control their administrative permissions.
        </Typography>
      </Box>

      {notice && <Alert severity={notice.type}>{notice.text}</Alert>}

      {canCreate && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Create administrator
          </Typography>

          <Box component="form" onSubmit={handleCreate}>
            <Grid container spacing={2}>
              {[
                ['firstName', 'First name'],
                ['lastName', 'Last name'],
                ['email', 'Email address'],
                ['phoneNumber', 'Phone number (optional)'],
                ['password', 'Temporary password'],
              ].map(([name, label]) => (
                <Grid item xs={12} sm={6} key={name}>
                  <TextField
                    fullWidth
                    label={label}
                    name={name}
                    type={
                      name === 'password'
                        ? 'password'
                        : name === 'email'
                          ? 'email'
                          : 'text'
                    }
                    value={form[name]}
                    required={[
                      'firstName',
                      'lastName',
                      'email',
                      'password',
                    ].includes(name)}
                    autoComplete={
                      name === 'password' ? 'new-password' : 'off'
                    }
                    inputProps={
                      name === 'password' ? { minLength: 8 } : undefined
                    }
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        [name]: event.target.value,
                      }))
                    }
                  />
                </Grid>
              ))}

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={createState.isLoading}
                >
                  {createState.isLoading
                    ? 'Creating…'
                    : 'Create administrator'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Existing administrators
        </Typography>

        {isLoading && <CircularProgress size={28} />}

        {error && (
          <Alert severity="error">
            Could not load administrator accounts. Check your permissions
            and backend response.
          </Alert>
        )}

        {!isLoading && !error && admins.length === 0 && (
          <Typography color="text.secondary">
            No administrator accounts were returned.
          </Typography>
        )}

        {!isLoading &&
          admins.map((admin) => {
            const currentPermissions =
              selectedPermissions[admin._id] ?? admin.permissions ?? []

            return (
              <Box key={admin._id} sx={{ py: 2 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Typography fontWeight={700}>
                      {admin.firstName} {admin.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {admin.email}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={
                      admin.isPrimaryAdmin
                        ? 'Primary administrator'
                        : admin.isActive
                          ? 'Active'
                          : 'Inactive'
                    }
                    color={
                      admin.isPrimaryAdmin
                        ? 'primary'
                        : admin.isActive
                          ? 'success'
                          : 'default'
                    }
                    variant="outlined"
                    sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  />
                </Stack>

                {user?.isPrimaryAdmin && !admin.isPrimaryAdmin && (
                  <Box sx={{ mt: 2 }}>
                    {Object.entries(permissionGroups).map(
                      ([group, permissions]) => (
                        <Box key={group} sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            {group}
                          </Typography>

                          <Grid container>
                            {permissions.map((permission) => (
                              <Grid
                                item
                                xs={12}
                                sm={6}
                                key={permission}
                              >
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={currentPermissions.includes(
                                        permission,
                                      )}
                                      onChange={(event) =>
                                        togglePermission(
                                          admin._id,
                                          permission,
                                          event.target.checked,
                                        )
                                      }
                                    />
                                  }
                                  label={permissionLabels[permission]}
                                />
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      ),
                    )}

                    <Button
                      variant="outlined"
                      onClick={() => savePermissions(admin)}
                      disabled={
                        permissionState.isLoading ||
                        JSON.stringify([...currentPermissions].sort()) ===
                          JSON.stringify(
                            [...(admin.permissions || [])].sort(),
                          )
                      }
                    >
                      Save permissions
                    </Button>
                  </Box>
                )}

                {!user?.isPrimaryAdmin && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Assigned permissions: {currentPermissions.length}
                  </Typography>
                )}

                <Divider sx={{ mt: 2 }} />
              </Box>
            )
          })}
      </Paper>
    </Stack>
  )
}
