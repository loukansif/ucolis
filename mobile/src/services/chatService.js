import api from './api';
import { ENDPOINTS } from '../constants/api';

/**
 * Récupère toutes les conversations de l'utilisateur connecté
 * @returns {Promise<object[]>}
 */
async function getConversations() {
  const response = await api.get(ENDPOINTS.CONVERSATIONS);
  return response.data;
}

/**
 * Récupère une conversation par son ID
 * @param {string} conversationId
 * @returns {Promise<object>}
 */
async function getConversationById(conversationId) {
  const response = await api.get(ENDPOINTS.CONVERSATION_BY_ID(conversationId));
  return response.data;
}

/**
 * Récupère les messages d'une conversation
 * @param {string} conversationId
 * @param {number} page
 * @returns {Promise<object>} { messages, total, page }
 */
async function getMessages(conversationId, page = 1) {
  const response = await api.get(ENDPOINTS.MESSAGES(conversationId), {
    params: { page, limit: 30 },
  });
  return response.data;
}

/**
 * Envoie un message dans une conversation
 * @param {string} conversationId
 * @param {string} contenu
 * @returns {Promise<object>}
 */
async function sendMessage(conversationId, contenu) {
  const response = await api.post(ENDPOINTS.SEND_MESSAGE(conversationId), { contenu });
  return response.data;
}

async function createConversation(recipientId, colisId) {
  const response = await api.post(ENDPOINTS.CREATE_CONVERSATION, { recipientId, colisId });
  return response.data;
}

async function markAsRead(conversationId) {
  const response = await api.patch(ENDPOINTS.MARK_MESSAGES_READ(conversationId));
  return response.data;
}

export const chatService = {
  getConversations,
  getConversationById,
  getMessages,
  createConversation,
  sendMessage,
  markAsRead,
};

export default chatService;