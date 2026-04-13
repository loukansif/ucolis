export const BASE_URL   = 'https://ucolis-backend.onrender.com/api';
export const SOCKET_URL = 'https://ucolis-backend.onrender.com';

export const ENDPOINTS = {
  // Auth — montées sur /api/auth
  LOGIN:           '/auth/login',
  REGISTER:        '/auth/register',
  REFRESH_TOKEN:   '/auth/refresh',
  LOGOUT:          '/auth/logout',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD:  '/auth/reset-password',

  // Utilisateurs
  ME:               '/users/me',
  UPDATE_PROFILE:   '/users/profile',
  UPLOAD_PHOTO:     '/users/profile/photo',
  CHANGE_PASSWORD:  '/users/password',
  USER_BY_ID:       (id) => `/users/${id}`,
  MY_RATINGS:       '/users/me/avis',
  DOCUMENTS:        '/users/me/documents',
  UPLOAD_DOCUMENT:  '/users/me/documents/upload',
  USER_PUSH_TOKEN:  '/users/me/push-token',

  // Colis
  PARCELS:              '/parcels',
  MY_PARCELS:           '/parcels/mes-colis',
  PARCEL_BY_ID:         (id) => `/parcels/${id}`,
  UPLOAD_PARCEL_PHOTOS: '/parcels/upload/photo',            // POST (retourne l'URL, pas d'id)
  UPDATE_PARCEL_STATUS: (id) => `/parcels/${id}/status`,    // PATCH ✅ était /statut

  // Offres — montées sur /api/offers
  OFFERS:           '/offers',                              // POST (créer offre)
  OFFERS_BY_PARCEL: (parcelId) => `/offers/parcel/${parcelId}`, // GET offres d'un colis
  MY_OFFERS:        '/offers/my-offers',                    // GET offres du transporteur
  ACCEPT_OFFER:     (id) => `/offers/${id}/accept`,         // PATCH accepter
  REJECT_OFFER:     (id) => `/offers/${id}/reject`,         // PATCH refuser
  COUNTER_OFFER:    (id) => `/offers/${id}/counter`,        // PATCH contre-offre ✅
  ACCEPT_COUNTER:   (id) => `/offers/${id}/accept-counter`, // PATCH transporteur accepte contre-offre ✅
  REJECT_COUNTER:   (id) => `/offers/${id}/reject-counter`, // PATCH transporteur refuse contre-offre ✅
  REOFFER:          (id) => `/offers/${id}/reoffer`,         // PATCH transporteur re-propose un prix ✅

  // Chat — montées sur /api/chat
  CONVERSATIONS:       '/chat/conversations',
  CONVERSATION_BY_ID:  (convId) => `/chat/conversations/${convId}`,
  MESSAGES:            (convId) => `/chat/conversations/${convId}/messages`,
  SEND_MESSAGE:        (convId) => `/chat/conversations/${convId}/messages`,
  CREATE_CONVERSATION: '/chat/conversations',

  // Notations — montées sur /api/ratings
  CREATE_RATING: '/ratings',
  CHECK_RATING:  (colisId) => `/ratings/check/${colisId}`,
  USER_RATINGS:  (userId)  => `/ratings/user/${userId}`,

  // Admin
  ADMIN_STATS:              '/admin/stats',
  ADMIN_USERS:              '/admin/users',
  ADMIN_USER_BY_ID:         (id) => `/admin/users/${id}`,
  ADMIN_TOGGLE_BAN:         (id) => `/admin/users/${id}/toggle-ban`,
  ADMIN_PROMOTE:            (id) => `/admin/users/${id}/promote`,
  ADMIN_DELETE_USER:        (id) => `/admin/users/${id}`,
  ADMIN_DOCUMENTS:          '/admin/documents',
  ADMIN_VALIDATE_DOCS:      (id) => `/admin/users/${id}/validate-docs`,
  ADMIN_PARCELS:            '/admin/parcels',
  ADMIN_PARCEL_STATUS:      (id) => `/admin/parcels/${id}/status`,
  ADMIN_DELETE_PARCEL:      (id) => `/admin/parcels/${id}`,
  ADMIN_REVIEWS:            '/admin/reviews',
  ADMIN_DELETE_REVIEW:      (id) => `/admin/reviews/${id}`,

  // Conversations admin
  ADMIN_CONVERSATIONS:        '/admin/conversations',
  ADMIN_CONV_BETWEEN:         (u1, u2) => `/admin/conversations/between/${u1}/${u2}`,
  ADMIN_CONV_MESSAGES:        (id) => `/admin/conversations/${id}/messages`,
  ADMIN_DELETE_CONV:          (id) => `/admin/conversations/${id}`,

  // Signalements
  CREATE_REPORT:    '/reports',
  ADMIN_REPORTS:    '/reports',
  ADMIN_REPORT_BY_ID: (id) => `/reports/${id}`,

  // Notifications — montées sur /api/notifications
  NOTIFICATIONS:    '/notifications',                 // GET
  MARK_NOTIF_READ:  (id) => `/notifications/${id}/lu`, // PATCH
  MARK_ALL_READ:    '/notifications/tout-lire',       // PATCH
  DELETE_NOTIF:     (id) => `/notifications/${id}`,   // DELETE
  DELETE_ALL_NOTIF: '/notifications',                 // DELETE
};