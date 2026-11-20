// client/src/services/sellerApi.js
import { api } from './api'

const sellerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Current backend route: GET /api/sellers/me
    // Server response: { seller: null } or { seller: {...} }
    getMySellerApplication: builder.query({
      query: () => '/sellers/me',
      transformResponse: (response) => response.seller ?? null,
      providesTags: ['Seller'],
    }),

    // Current backend route: POST /api/sellers/application
    // Expects accountType, dateOfBirth, shopName, county, town,
    // description, and companyName when accountType is "company".
    submitSellerApplication: builder.mutation({
      query: (application) => ({
        url: '/sellers/application',
        method: 'POST',
        body: application,
      }),
      transformResponse: (response) => response.seller,
      invalidatesTags: ['Seller'],
    }),

    // Current backend route: PUT /api/sellers/me
    // Pending applicants send the full form. Approved sellers may update
    // county, town, and description, based on the server rules.
    updateSellerApplication: builder.mutation({
      query: (application) => ({
        url: '/sellers/me',
        method: 'PUT',
        body: application,
      }),
      transformResponse: (response) => response.seller,
      invalidatesTags: ['Seller'],
    }),

    // Current backend route: POST /api/sellers/me/resubmit
    resubmitSellerApplication: builder.mutation({
      query: (application) => ({
        url: '/sellers/me/resubmit',
        method: 'POST',
        body: application,
      }),
      transformResponse: (response) => response.seller,
      invalidatesTags: ['Seller'],
    }),

    // Planned backend route: GET /api/sellers/dashboard/overview
    getSellerDashboardOverview: builder.query({
      query: () => '/sellers/dashboard/overview',
      transformResponse: (response) => response.overview,
      providesTags: ['SellerOverview'],
    }),

    // Planned backend routes:
    // GET    /api/sellers/products
    // GET    /api/sellers/products/:productId
    // POST   /api/sellers/products
    // PATCH  /api/sellers/products/:productId
    // DELETE /api/sellers/products/:productId
    getSellerProducts: builder.query({
      query: (params = {}) => ({
        url: '/sellers/products',
        params,
      }),
      // Planned response: { products: [...], pagination: {...} }
      transformResponse: (response) => ({
        products: response.products ?? [],
        pagination: response.pagination ?? null,
      }),
      providesTags: (result) => [
        { type: 'SellerProduct', id: 'LIST' },
        ...(result?.products ?? []).map(({ id }) => ({
          type: 'SellerProduct',
          id,
        })),
      ],
    }),

    getSellerProduct: builder.query({
      query: (productId) => `/sellers/products/${productId}`,
      transformResponse: (response) => response.product,
      providesTags: (_result, _error, productId) => [
        { type: 'SellerProduct', id: productId },
      ],
    }),

    createSellerProduct: builder.mutation({
      query: (product) => ({
        url: '/sellers/products',
        method: 'POST',
        body: product,
      }),
      transformResponse: (response) => response.product,
      invalidatesTags: [
        { type: 'SellerProduct', id: 'LIST' },
        'SellerOverview',
      ],
    }),

    updateSellerProduct: builder.mutation({
      query: ({ productId, ...changes }) => ({
        url: `/sellers/products/${productId}`,
        method: 'PATCH',
        body: changes,
      }),
      transformResponse: (response) => response.product,
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'SellerProduct', id: productId },
        { type: 'SellerProduct', id: 'LIST' },
        'SellerOverview',
      ],
    }),

    deactivateSellerProduct: builder.mutation({
      query: (productId) => ({
        url: `/sellers/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, productId) => [
        { type: 'SellerProduct', id: productId },
        { type: 'SellerProduct', id: 'LIST' },
        'SellerOverview',
      ],
    }),

           activateSellerProduct: builder.mutation({
        query: (productId) => ({
          url: `/sellers/products/${productId}/activate`,
          method: 'POST',
          body: {},
        }),
        transformResponse: (response) => response.product,
        invalidatesTags: (_result, _error, productId) => [
          { type: 'SellerProduct', id: productId },
          { type: 'SellerProduct', id: 'LIST' },
          'SellerOverview',
          'Product',
        ],
      }),



           // One toggle used by SellerProducts.jsx: { id, active: true | false }
      setSellerProductActive: builder.mutation({
        query: ({ id, active }) => ({
          url: `/sellers/products/${id}/${active ? 'activate' : 'deactivate'}`,
          method: 'POST',
          body: {},
        }),
        transformResponse: (response) => response.product,
        invalidatesTags: (_result, _error, { id }) => [
          { type: 'SellerProduct', id },
          { type: 'SellerProduct', id: 'LIST' },
          'SellerOverview',
          'Product',
        ],
      }),

       // Categories for the product form. Same route as your getCategories;
      // tolerant of an array or a { categories } response.
      getSellerFormCategories: builder.query({
        query: () => '/categories',
        transformResponse: (response) =>
          Array.isArray(response)
            ? response
            : response.categories ?? response.data ?? [],
        providesTags: ['Category'],
      }),

      // PLANNED, backend route not built yet: POST /sellers/products/images
      // (FormData, same idea as your uploadProductImage). Not used by the form yet.
      uploadSellerProductImage: builder.mutation({
        query: (file) => {
          const formData = new FormData()
          formData.append('image', file)
          return {
            url: '/sellers/products/images',
            method: 'POST',
            body: formData,
          }
        },
        transformResponse: (response) => response.data,
      }),

    // Planned backend routes:
    // GET /api/sellers/orders
    // GET /api/sellers/orders/:orderId
    getSellerOrders: builder.query({
      query: (params = {}) => ({
        url: '/sellers/orders',
        params,
      }),
      // Planned response: { orders: [...], pagination: {...} }
      transformResponse: (response) => ({
        orders: response.orders ?? [],
        pagination: response.pagination ?? null,
      }),
      providesTags: (result) => [
        { type: 'SellerOrder', id: 'LIST' },
        ...(result?.orders ?? []).map(({ id }) => ({
          type: 'SellerOrder',
          id,
        })),
      ],
    }),

    getSellerOrder: builder.query({
      query: (orderId) => `/sellers/orders/${orderId}`,
      transformResponse: (response) => response.order,
      providesTags: (_result, _error, orderId) => [
        { type: 'SellerOrder', id: orderId },
      ],
    }),

         // GET /admin/sellers?status=&search=&page=&limit=
      // Server response: { sellers, page, limit, total, totalPages }
      getAdminSellers: builder.query({
        query: (params = {}) => ({
          url: '/admin/sellers',
          params,
        }),
        providesTags: ['AdminSeller'],
      }),

      // GET /admin/sellers/:id  ->  { seller }
      getAdminSeller: builder.query({
        query: (id) => `/admin/sellers/${id}`,
        transformResponse: (response) => response.seller,
        providesTags: ['AdminSeller'],
      }),

      // POST /admin/sellers/:id/{approve|reject|suspend|reactivate}
      // reject needs a reason (3-500 characters).
      reviewSeller: builder.mutation({
        query: ({ id, action, reason }) => ({
          url: `/admin/sellers/${id}/${action}`,
          method: 'POST',
          body: action === 'reject' ? { reason } : {},
        }),
        transformResponse: (response) => response.seller,
        // approve/suspend/reactivate change which products buyers can see
        invalidatesTags: ['AdminSeller', 'Product'],
      }),

      // ---------------------------------------------------------------
      // Admin: customers (backend: adminCustomerRoutes, needs customers.read)
      // ---------------------------------------------------------------

      // GET /admin/customers?search=&page=&limit=
      // Server response: { customers, page, limit, total, totalPages }
      getAdminCustomers: builder.query({
        query: (params = {}) => ({
          url: '/admin/customers',
          params,
        }),
        providesTags: ['AdminCustomer'],
      }),
  }),
})

export const {
  // applicant
  useGetMySellerApplicationQuery,
  useSubmitSellerApplicationMutation,
  useUpdateSellerApplicationMutation,
  useResubmitSellerApplicationMutation,
  // dashboard
  useGetSellerDashboardOverviewQuery,
  // products
  useGetSellerProductsQuery,
  useGetSellerProductQuery,
  useCreateSellerProductMutation,
  useUpdateSellerProductMutation,
  useDeactivateSellerProductMutation,
  useActivateSellerProductMutation,
  useSetSellerProductActiveMutation,
  useGetSellerFormCategoriesQuery,
  useUploadSellerProductImageMutation,
  // orders
  useGetSellerOrdersQuery,
  useGetSellerOrderQuery,
  // admin
  useGetAdminSellersQuery,
  useGetAdminSellerQuery,
  useReviewSellerMutation,
  useGetAdminCustomersQuery,
} = sellerApi

// Shorter names used by the Phase 6 pages, so they work without edits.
export const useGetMySellerQuery = useGetMySellerApplicationQuery
export const useApplySellerMutation = useSubmitSellerApplicationMutation
export const useUpdateMySellerMutation = useUpdateSellerApplicationMutation
export const useResubmitSellerMutation = useResubmitSellerApplicationMutation

export default sellerApi
