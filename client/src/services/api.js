import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { refreshAccessToken } from './authRefresh'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: 'include',
})

// A 401 from these means "wrong credentials" or "already logged out", not "token expired".
const NO_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']

const baseQueryWithReauth = async (args, baseApi, extraOptions) => {
  let result = await rawBaseQuery(args, baseApi, extraOptions)

  const url = typeof args === 'string' ? args : args.url
  if (result.error?.status === 401 && !NO_REFRESH_URLS.includes(url)) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      result = await rawBaseQuery(args, baseApi, extraOptions) // retry once
    }
  }
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Category', 'Cart', 'Auth', 'Admin', 'Order'],
  // ...endpoints stay exactly as they are


  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params = {}) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Product'],
    }),

    getAdminProducts: builder.query({
  query: (params = {}) => ({
    url: '/products/admin',
    params,
  }),
  providesTags: ['Product'],
}),


    getProductBySlug: builder.query({
  query: (slug) => `/products/slug/${encodeURIComponent(slug)}`,
  transformResponse: (response) => response.data,
}),

    getCategories: builder.query({
      query: () => '/categories',
      providesTags: ['Category'],
    }),

    getAdminCategories: builder.query({
  query: () => '/categories/admin',
  providesTags: ['Category'],
}),



    getCart: builder.query({
        query: ()=> '/cart',
        providesTags: ['Cart'],
    }),

    addCartItem  : builder.mutation({
          query: ({ productId, quantity = 1 }) => ({
        url: '/cart/items',
        method: 'POST',
        body: { productId, quantity },

        }),
        invalidatesTags: ['Cart'],
    }),

     updateCartItemQuantity: builder.mutation({
      query: ({ productId, quantity }) => ({
        url: `/cart/items/${productId}`,
        method: 'PATCH',
        body: { quantity },
      }),

      invalidatesTags: ['Cart'],
    }),

    // Remove one product from the cart.
    removeCartItem: builder.mutation({
      query: (productId) => ({
        url: `/cart/items/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Remove all products from the cart.
    clearCart: builder.mutation({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
  }),

    getProductById : builder.query({
        query: (id) => `/products/${id}`,
        providesTags: ['Product'],
    }),

    
    // Retrieve the currently authenticated user.
    getMe: builder.query({
      query: () => '/auth/me',
      transformResponse: (response) => response.user,
      providesTags: ['Auth'],
    }),

    // Register a new customer account.
    register: builder.mutation({
      query: (userDetails) => ({
        url: '/auth/register',
        method: 'POST',
        body: userDetails,
      }),
      transformResponse: (response) => response.data.user,
    }),

    // Sign in and establish a server-side session.
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response) => response.user,
      invalidatesTags: ['Auth', 'Cart'],
    }),

    // Sign out and refresh authentication/cart data.
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'Cart'],
    }),


        // Retrieve administrator accounts.
    getAdmins: builder.query({
      query: () => '/admins',
      providesTags: ['Admin'],
    }),

    // Create an administrator. New accounts receive no permissions.
    createAdmin: builder.mutation({
      query: (adminDetails) => ({
        url: '/admins',
        method: 'POST',
        body: adminDetails,
      }),
      invalidatesTags: ['Admin'],
    }),

    // Replace an administrator's permission list.
    updateAdminPermissions: builder.mutation({
      query: ({ id, permissions }) => ({
        url: `/admins/${id}/permissions`,
        method: 'PATCH',
        body: { permissions },
      }),
      invalidatesTags: ['Admin'],
    }),

    
createProduct: builder.mutation({
  query: (productData) => ({
    url: '/products',
    method: 'POST',
    body: productData,
  }),
  invalidatesTags: ['Product'],
}),

uploadProductImage: builder.mutation({
  query: (file) => {
    const formData = new FormData()
    formData.append('image', file)

    return {
      url: '/products/images',
      method: 'POST',
      body: formData,
    }
  },
  transformResponse: (response) => response.data,
}),

updateProduct: builder.mutation({
  query: ({ id, ...productData }) => ({
    url: `/products/${id}`,
    method: 'PATCH',
    body: productData,
  }),
  invalidatesTags: ['Product'],
}),

deactivateProduct: builder.mutation({
  query: (id) => ({
    url: `/products/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Product'],
}),


activateProduct: builder.mutation({
  query: (id) => ({
    url: `/products/${id}/activate`,
    method: 'PATCH',
  }),
  invalidatesTags: ['Product'],
}),


// Create a category
createCategory: builder.mutation({
  query: (categoryData) => ({
    url: '/categories',
    method: 'POST',
    body: categoryData,
  }),
  invalidatesTags: ['Category'],
}),

// Update a category
updateCategory: builder.mutation({
  query: ({ id, ...categoryData }) => ({
    url: `/categories/${id}`,
    method: 'PATCH',
    body: categoryData,
  }),
  invalidatesTags: ['Category'],
}),

// Deactivate a category
deactivateCategory: builder.mutation({
  query: (id) => ({
    url: `/categories/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Category'],
}),

// Activate a previously deactivated category
activateCategory: builder.mutation({
  query: (id) => ({
    url: `/categories/${id}/activate`,
    method: 'PATCH',
  }),
  invalidatesTags: ['Category'],
}),

// Place an order from the current cart.
// The idempotencyKey stops double-clicks and retries from creating duplicate orders.
placeOrder: builder.mutation({
  query: ({ idempotencyKey, ...checkoutData }) => ({
    url: '/orders',
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: checkoutData,
  }),
  transformResponse: (response) => response.order,
  // The cart is emptied by the backend, so refresh it (this resets the cart badge).
  invalidatesTags: ['Cart', 'Order'],
}),

getMyOrders: builder.query({
  query: () => '/orders/my-orders',
  transformResponse: (response) => response.orders,
  providesTags: ['Order'],
}),

// already works and helpss with payments 
getOrderById: builder.query({
  query: (id) => `/orders/${id}`,
  transformResponse: (response) => response.order,
  providesTags: ['Order'],
}),


// ---- Admin orders ----
getAdminDashboardOverview: builder.query({
  query: () => '/orders/admin/overview',
  providesTags: ['Order', 'Product'],
}),

getAdminOrders: builder.query({
  query: (params = {}) => ({
    url: '/orders',
    params,
  }),
  providesTags: ['Order'],
}),

getAdminOrderById: builder.query({
  query: (id) => `/orders/admin/${id}`,
  transformResponse: (response) => response.order,
  providesTags: ['Order'],
}),

updateOrderStatus: builder.mutation({
  query: ({ id, status }) => ({
    url: `/orders/${id}/status`,
    method: 'PATCH',
    body: { status },
  }),
  invalidatesTags: ['Order'],
}),

cancelOrder: builder.mutation({
  query: (id) => ({
    url: `/orders/${id}/cancel`,
    method: 'PATCH',
  }),
  // Cancelling puts stock back, so refresh product data too.
  invalidatesTags: ['Order', 'Product'],
}),

//pay for order

// Send the M-Pesa payment prompt to the customer's phone.
payOrderWithMpesa: builder.mutation({
  query: ({ orderId, phone }) => ({
    url: '/payments/stk-push',
    method: 'POST',
    body: { orderId, phone },
  }),
  // Refresh order data after a new payment prompt is accepted.
  invalidatesTags: ['Order'],
}),

reconcileMpesaReceipt: builder.mutation({
  query: ({ orderId, receipt }) => ({
    url: '/payments/reconcile-receipt',
    method: 'POST',
    body: { orderId, receipt },
  }),
}),

}),
})

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
   useGetCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
  useGetProductBySlugQuery,
  useGetMeQuery,
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminPermissionsMutation,
  useGetAdminProductsQuery,
    useCreateProductMutation,
  useUploadProductImageMutation,
    useUpdateProductMutation,
    useDeactivateProductMutation,
    useCreateCategoryMutation,
useUpdateCategoryMutation,
useDeactivateCategoryMutation,
useActivateCategoryMutation,
useGetAdminCategoriesQuery,
useActivateProductMutation,
usePlaceOrderMutation,
useGetMyOrdersQuery,
useGetOrderByIdQuery,
useGetAdminOrdersQuery,
useGetAdminDashboardOverviewQuery,
useGetAdminOrderByIdQuery,
useUpdateOrderStatusMutation,
useCancelOrderMutation,
usePayOrderWithMpesaMutation,
useReconcileMpesaReceiptMutation,
} = api
