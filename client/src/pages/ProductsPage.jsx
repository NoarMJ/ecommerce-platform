
import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Skeleton,
} from '@mui/material'

import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'

import {
  useGetProductsQuery,
  useGetCategoriesQuery,
} from '../services/api.js'

import ProductCard from '../components/ProductCard.jsx'   

function ProductsPage() {
  // Track the selected category and search input.
  const [selectedCategories, setSelectedCategories] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Track the current page.
  const [page, setPage] = useState(1)
  const productsPerPage = 8

  // Fetch products using the current filters and page.
  const {
    data: productResponse,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
    error: productError,
  } = useGetProductsQuery({
    page,
    limit: productsPerPage,
    category: selectedCategories.length 
    ? selectedCategories.join(',') :undefined,
    search: searchTerm || undefined,
  })

  // Fetch categories dynamically from the backend.
  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useGetCategoriesQuery()

  const products = productResponse?.data ?? []
  const categories = categoryResponse?.data ?? []

  const totalProducts =
    productResponse?.pagination?.total ?? products.length

  const totalPages = productResponse?.pagination?.totalPages ?? 1

  // Display a loading indicator for the initial product request.
  if (productsLoading && !productResponse) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
          Products
        </Typography>

        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Grid
              key={index}
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            >
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  p: 1,
                }}
              >
                <Skeleton variant="rectangular" height={190} />
                <Box sx={{ p: 1 }}>
                  <Skeleton width="80%" height={28} />
                  <Skeleton width="50%" />
                  <Skeleton width="65%" height={32} />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  if (productsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Unable to load products.
          {productError?.status
            ? ` Error: ${productError.status}`
            : ''}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Products
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Explore products available at 2 Valid.
      </Typography>

      {/* Product search */}
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setSearchTerm(searchInput.trim())
        }}
        sx={{
          display: 'flex',
          gap: 1,
          mb: 3,
          maxWidth: 650,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search products..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchInput && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchInput('')
                      setSearchTerm('')
                      setPage(1)
                    }}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button type="submit" variant="contained">
          Search
        </Button>
      </Box>

      
      {/* Dynamic multi-select category filters */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Browse categories
      </Typography>

      <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
        Select multiple categories to see products matching any selection.
        Click a selected category again to remove it.
      </Typography>

      {categoriesLoading ? (
        <CircularProgress size={24} />
      ) : categoriesError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Categories could not be loaded. You can still browse all products.
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            mb: 3,
          }}
        >
          <Button
            variant={
              selectedCategories.length === 0 ? 'contained' : 'outlined'
            }
            onClick={() => {
              setSelectedCategories([])
              setPage(1)
            }}
          >
            All products
          </Button>

          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category.slug)

            return (
              <Button
                key={category._id}
                variant={isSelected ? 'contained' : 'outlined'}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedCategories((previous) =>
                    previous.includes(category.slug)
                      ? previous.filter((slug) => slug !== category.slug)
                      : [...previous, category.slug]
                  )

                  setPage(1)
                }}
              >
                {category.name}
              </Button>
            )
          })}
        </Box>
      )}


      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {totalProducts} products found
      </Typography>

      {/* Product results */}
      {productsFetching ? (
        <Grid container spacing={2}>
          {Array.from({ length: productsPerPage }).map((_, index) => (
            <Grid
              key={index}
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            >
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  p: 1,
                }}
              >
                <Skeleton variant="rectangular" height={190} />
                <Box sx={{ p: 1 }}>
                  <Skeleton width="80%" height={28} />
                  <Skeleton width="50%" />
                  <Skeleton width="65%" height={32} />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : products.length === 0 ? (
        <Alert severity="info">
          No products match your search or selected category.
        </Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            {products.map((product) => (
              <Grid
                  key={product._id}
                     size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
             >
                  <ProductCard product={product} />
                 </Grid>
                ))}
            </Grid>

          {/* Pagination appears below the product grid */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 4,
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default ProductsPage
