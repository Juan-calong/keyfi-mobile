export const endpoints = {
  health: "/health",
  ready: "/ready",

  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    sessions: "/auth/sessions",
    sessionById: (id: string) => `/auth/sessions/${id}`,
    registerSeller: "/auth/register/seller",
    registerSalon: "/auth/register/salon",
    registerCustomer: "/auth/register/customer",
  },

  onboarding: {
    salon: "/onboarding/salon",
    seller: "/onboarding/seller",
  },

  profiles: {
    me: "/profiles/me",
  },

  categories: {
    list: "/categories",
  },

products: {
  list: "/products",
  create: "/products",
  byId: (id: string) => `/products/${id}`,
  update: (id: string) => `/products/${id}`,
  related: (id: string) => `/products/${id}/related`,
  promosActive: "/products/promotions/active",

  favorite: (id: string) => `/products/${id}/favorite`,
  favorites: "/products/favorites",

  comments: (id: string) => `/products/${id}/comments`,
  commentsMe: (id: string) => `/products/${id}/comments/me`,
},

  shipping: {
    quote: "/shipping/quote",
  },

  cart: {
    preview: "/cart/preview",
  },

  referrals: {
    applyInviteForCurrentUser: "/seller/referrals/apply",
    setSalonReferrerOnce: "/seller/referrer",
    sellerMe: "/seller/referrals/me",
    salonMe: "/seller/salon-referrals/me",
  },

sellerPermissions: "/seller/permissions",
sellerRequestPermission: (salonId: string) =>
  `/seller/salons/${salonId}/permission-request`,

sellerCreateDraftOrder: (salonId: string) =>
  `/seller/salons/${salonId}/orders/draft`,

sellerCartRequests: {
  create: (salonId: string) => `/seller/salons/${salonId}/cart-requests`,
  list: "/seller/cart-requests",
  byId: (id: string) => `/seller/cart-requests/${id}`,
  send: (id: string) => `/seller/cart-requests/${id}/send`,
},

  salonCartRequests: {
    list: "/salon/cart-requests",
    byId: (id: string) => `/salon/cart-requests/${id}`,
    approve: (id: string) => `/salon/cart-requests/${id}/approve`,
    reject: (id: string) => `/salon/cart-requests/${id}/reject`,
  },

  salonInviteSellerByEmail: "/seller/sellers/invite",
  salonPermissionRequests: "/seller/permission-requests",
  salonDecidePermissionRequest: (id: string) => `/seller/permission-requests/${id}`,

  orders: {
    list: "/orders",
    create: "/orders",
    byId: (id: string) => `/orders/${id}`,
    checkout: (id: string) => `/orders/${id}/checkout`,
  },

    refundRequests: {
    create: (orderId: string) => `/orders/${orderId}/refund-requests`,
    mine: "/me/refund-requests",
  },

  payments: {
    active: (orderId: string) => `/payments/${orderId}/active`,
    intent: (orderId: string) => `/payments/${orderId}/intent`,
    options: "/payments/options",
    methods: "/payments/methods",
    installments: "/payments/installments",
  },

  cielo: {
    sopPage: "/cielo/sop/page",
    sopBootstrap: "/cielo/sop/bootstrap",
  },

  wallet: {
    me: "/wallet",
    settle: "/wallet/settle",
    payout: "/wallet/payout",
    destination: "/wallet/destination",
  },

  coupons: {
    validate: "/coupons/validate",
  },

  reports: {
    sales: "/reports/sales",
    commissions: "/reports/commissions",
    bestSellers: "/reports/best-sellers",
  },

  home: {
    banners: "/home/banners",
    meBanners: "/home/me/banners",
  },

  trainingVideos: {
    listAll: "/training-videos",
    listByProduct: (productId: string) => `/products/${productId}/training-videos`,
  },

  utils: {
    cep: (cep: string) => `/utils/cep/${cep}`,
    cnpj: (cnpj: string) => `/utils/cnpj/${cnpj}`,
  },

  sellerBeneficiary: {
    me: "/seller-beneficiary/me",
  },

  devices: {
  registerPushToken: "/devices/push-token",
  removePushToken: "/devices/push-token/remove",
},

salon: {
  inviteLink: "/salon/invite-link",
},
} as const;