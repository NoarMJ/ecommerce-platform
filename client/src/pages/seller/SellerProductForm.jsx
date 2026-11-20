import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import {
  useCreateSellerProductMutation,
  useGetSellerFormCategoriesQuery,
  useGetSellerProductQuery,
  useUpdateSellerProductMutation,
} from '../../services/sellerApi';
import { apiErrorMessage, apiFieldErrors } from '../../utils/apiError';
import { fromMinor, toMinor } from '../../utils/money';
import PageSpinner from '../../components/seller/PageSpinner';

const EMPTY = {
  name: '',
  description: '',
  price: '',
  stock: '0',
  categoryId: '',
  categoryIds: [],
  imagesText: '',
  sku: '',
};

const parseImages = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter a product name.';
  if (!form.description.trim()) errors.description = 'Enter a description.';
  if (toMinor(form.price) === null) errors.price = 'Enter a price greater than 0.';
  if (!/^\d+$/.test(form.stock.trim())) errors.stock = 'Stock must be a whole number (0 or more).';
  if (!form.categoryId) errors.categoryId = 'Choose a category.';
  if (parseImages(form.imagesText).some((url) => !/^https:\/\//i.test(url))) {
    errors.images = 'Each image must be an https:// URL, one per line.';
  }
  return errors;
}

export default function SellerProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: product, isLoading: loadingProduct, isError: productError } = useGetSellerProductQuery(id, {
    skip: !isEdit,
  });
  const { data: categories = [], isLoading: loadingCategories } = useGetSellerFormCategoriesQuery();
  const [createProduct, createState] = useCreateSellerProductMutation();
  const [updateProduct, updateState] = useUpdateSellerProductMutation();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      description: product.description,
      price: fromMinor(product.priceMinor),
      stock: String(product.stock),
      categoryId: product.category?.id || '',
      categoryIds: (product.categories || []).map((c) => c.id),
      imagesText: (product.images || []).join('\n'),
      sku: product.sku,
    });
  }, [product]);

  if ((isEdit && loadingProduct) || loadingCategories) return <PageSpinner />;
  if (isEdit && productError) {
    return (
      <Alert severity="error">
        Product not found. <RouterLink to="/seller/products">Back to products</RouterLink>
      </Alert>
    );
  }

  const saving = createState.isLoading || updateState.isLoading;
  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
    error: Boolean(errors[name]),
    helperText: errors[name],
    fullWidth: true,
  });

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      priceMinor: toMinor(form.price),
      stock: Number(form.stock),
      images: parseImages(form.imagesText),
      categoryId: form.categoryId,
      categoryIds: form.categoryIds.filter((c) => c !== form.categoryId),
      ...(!isEdit && form.sku.trim() ? { sku: form.sku.trim() } : {}),
    };

    try {
      if (isEdit) await updateProduct({ id, ...body }).unwrap();
      else await createProduct(body).unwrap();
      navigate('/seller/products');
    } catch (err) {
      const serverErrors = apiFieldErrors(err);
      // the server calls the price field "priceMinor"
      if (serverErrors.priceMinor) serverErrors.price = serverErrors.priceMinor;
      setErrors(serverErrors);
      setFormError(apiErrorMessage(err));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }} component="form" onSubmit={submit} noValidate>
      <Stack spacing={2.5}>
        <Typography variant="h5">{isEdit ? 'Edit product' : 'Add a product'}</Typography>
        {formError && <Alert severity="error">{formError}</Alert>}

        <TextField {...field('name')} label="Product name" />
        <TextField {...field('description')} label="Description" multiline minRows={3} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField {...field('price')} label="Price (KES)" inputMode="decimal" />
          <TextField {...field('stock')} label="Stock" inputMode="numeric" />
        </Stack>
        <TextField {...field('categoryId')} select label="Category">
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          {...field('categoryIds')}
          select
          label="Extra categories (optional)"
          slotProps={{ select: { multiple: true } }}
        >
          {categories
            .filter((c) => c.id !== form.categoryId)
            .map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          {...field('imagesText')}
          error={Boolean(errors.images)}
          helperText={errors.images || 'One https image URL per line (up to 8).'}
          label="Image URLs"
          multiline
          minRows={3}
        />
        <TextField
          {...field('sku')}
          label="SKU"
          disabled={isEdit}
          helperText={errors.sku || (isEdit ? 'SKU cannot be changed.' : 'Optional. We generate one if left empty.')}
        />

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <Button component={RouterLink} to="/seller/products" disabled={saving}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
