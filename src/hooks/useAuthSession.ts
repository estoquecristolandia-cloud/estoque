import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getUserProfile, createUserProfile, logoutUser, AppUserProfile } from '../firebase';
import { subscribeToUsers } from '../services/firestoreService';

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setCurrentUser(null);
          return;
        }
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          profile = await createUserProfile(user, 'pendente');
        }
        setCurrentUser(profile);
      } catch (err) {
        console.error('Erro ao carregar perfil de usuário no useAuthSession:', err);
        setCurrentUser(null);
      } finally {
        setAuthResolved(true);
      }
    });

    return () => unsubAuth();
  }, []);

  // Assinatura da lista de usuários se o usuário for administrador
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const unsub = subscribeToUsers((users) => setAllUsers(users));
      return () => unsub();
    } else {
      setAllUsers([]);
    }
  }, [currentUser?.role]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  }, []);

  const handleLoginSuccess = useCallback((profile: AppUserProfile) => {
    setCurrentUser(profile);
  }, []);

  return {
    currentUser,
    setCurrentUser,
    authResolved,
    allUsers,
    handleLogout,
    handleLoginSuccess,
    isAdmin: currentUser?.role === 'admin',
    isPendente: currentUser?.role === 'pendente',
  };
}
