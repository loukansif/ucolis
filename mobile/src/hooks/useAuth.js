import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * Hook raccourci pour accéder au contexte d'authentification.
 * Expose : user, token, isLoading, isLoggedIn, error,
 *          login(), register(), logout(), updateUser(), clearError()
 */
export function useAuth() {
  return useAuthContext();
}

export default useAuth;
