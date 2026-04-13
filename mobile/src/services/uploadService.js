import api from './api';
import { ENDPOINTS } from '../constants/api';

/**
 * Upload un fichier (document ou photo) via FormData
 * @param {string} uri         - URI locale du fichier
 * @param {string} type        - MIME type (ex: 'image/jpeg')
 * @param {string} name        - Nom du fichier
 * @param {string} fieldName   - Nom du champ FormData
 * @param {string} endpoint    - Endpoint API
 * @returns {Promise<object>}
 */
async function uploadFile(uri, type, name, fieldName, endpoint) {
  const formData = new FormData();
  formData.append(fieldName, {
    uri,
    type,
    name,
  });

  const response = await api.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Upload la photo de profil
 * @param {string} uri
 * @param {string} type
 * @param {string} name
 * @returns {Promise<object>} { photoProfil: url }
 */
async function uploadProfilePhoto(uri, type = 'image/jpeg', name = 'profile.jpg') {
  return uploadFile(uri, type, name, 'photoProfil', `${ENDPOINTS.USER_PROFILE}/photo`);
}

/**
 * Upload le registre de commerce
 * @param {string} uri
 * @param {string} type
 * @param {string} name
 * @returns {Promise<object>}
 */
async function uploadRegistreCommerce(uri, type = 'image/jpeg', name = 'registre.jpg') {
  return uploadFile(uri, type, name, 'registreCommerce', ENDPOINTS.USER_UPLOAD_DOCS);
}

/**
 * Upload le permis de conduire
 * @param {string} uri
 * @param {string} type
 * @param {string} name
 * @returns {Promise<object>}
 */
async function uploadPermisConduire(uri, type = 'image/jpeg', name = 'permis.jpg') {
  return uploadFile(uri, type, name, 'permisConduire', ENDPOINTS.USER_UPLOAD_DOCS);
}

/**
 * Upload une photo de colis
 * @param {string} parcelId
 * @param {string} uri
 * @param {string} type
 * @param {string} name
 * @returns {Promise<object>}
 */
async function uploadParcelPhoto(parcelId, uri, type = 'image/jpeg', name = 'colis.jpg') {
  return uploadFile(
    uri, type, name, 'photo',
    `${ENDPOINTS.PARCEL_BY_ID(parcelId)}/photos`
  );
}

export const uploadService = {
  uploadFile,
  uploadProfilePhoto,
  uploadRegistreCommerce,
  uploadPermisConduire,
  uploadParcelPhoto,
};

export default uploadService;