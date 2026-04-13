export const APP_CONFIG = {
  APP_NAME:         'UCOLIS',
  DEFAULT_LANGUAGE: 'fr',
  LANG_KEY:         '@ucolis_lang',
  ONBOARDING_KEY:   '@ucolis_onboarding_done',
  TOKEN_KEY:        '@ucolis_token',
  REFRESH_TOKEN_KEY:'@ucolis_refresh_token',
  USER_KEY:         '@ucolis_user',
  MAX_PHOTOS:       5,
};

export const USER_ROLES = {
  SENDER:  'sender',
  CARRIER: 'carrier',
  BOTH:    'both',
};

export const USER_TYPES = {
  PARTICULIER:  'particulier',
  PROFESSIONNEL:'professionnel',
};

export const PARCEL_STATUS = {
  DISPONIBLE:     'disponible',
  EN_NEGOCIATION: 'en_negociation',
  ACCEPTE:        'accepte',
  EN_LIVRAISON:   'en_livraison',
  LIVRE:          'livre',
  ANNULE:         'annule',
};

export const NOTIF_TYPES = {
  NOUVELLE_ANNONCE:  'nouvelle_annonce',
  NOUVELLE_OFFRE:    'nouvelle_offre',
  OFFRE_ACCEPTEE:    'offre_acceptee',
  OFFRE_REFUSEE:     'offre_refusee',
  NOUVEAU_MESSAGE:   'nouveau_message',
  STATUT_LIVRAISON:  'statut_livraison',
  DOCUMENT_VALIDE:   'document_valide',
  DOCUMENT_REFUSE:   'document_refuse',
};

export const OFFER_STATUS = {
  EN_ATTENTE: 'en_attente',
  ACCEPTE:    'accepte',
  REFUSE:     'refuse',
  ANNULE:     'annule',
};
