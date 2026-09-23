import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logoutUser, AppUserProfile } from '../firebase';
import { checkUserAuthorization, subscribeToAuthorizedUsers, bootstrapOfficialAuthorizedUsers } from '../services/firestoreService';
import { AuthorizedUser } from '../types';

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        setAuthErrorMessage('');
        if (!user) {
          setCurrentUser(null);
          return;
        }

        const cleanEmail = (user.email || '').toLowerCase().trim();

        // 1. Administrador Mestre Único
        if (cleanEmail === 'estoquecristolandia@gmail.com') {
          const adminProfile: AppUserProfile = {
            uid: user.uid,
            email: 'estoquecristolandia@gmail.com',
            displayName: user.displayName || 'Marconi Castro (Administrador)',
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
          setCurrentUser(adminProfile);
          // Assegura de forma transparente e resiliente que os 3 acessos oficiais existam no Firestore
          bootstrapOfficialAuthorizedUsers().catch((err) => {
            console.warn('Bootstrap de autorizações em segundo plano:', err);
          });
          return;
        }

        // 2. Consulta estrita de Pré-Autorização (Opção B - Fonte única em /authorized_users)
        const authRecord = await checkUserAuthorization(cleanEmail);

        if (authRecord && authRecord.active === true) {
          const viewerProfile: AppUserProfile = {
            uid: user.uid,
            email: cleanEmail,
            displayName: authRecord.name || user.displayName || 'Visualizador Autorizado',
            role: 'viewer',
            createdAt: authRecord.authorizedAt || new Date().toISOString(),
          };
          setCurrentUser(viewerProfile);
        } else {
          // Bloqueio imediato para contas não autorizadas
          await logoutUser();
          setCurrentUser(null);
          setAuthErrorMessage(
            'Acesso não autorizado. O e-mail ' + cleanEmail + ' não possui liberação prévia da coordenação do Estoque Cristolândia.'
          );
        }
      } catch (err) {
        console.error('Erro ao processar autenticação no useAuthSession:', err);
        setCurrentUser(null);
      } finally {
        setAuthResolved(true);
      }
    });

    return () => unsubAuth();
  }, []);

  // Assinatura da lista de autorizados exclusiva para o Administrador
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const unsub = subscribeToAuthorizedUsers((users) => setAuthorizedUsers(users));
      return () => unsub();
    } else {
      setAuthorizedUsers([]);
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

  // Mapeamento compatível para componentes legados que usam allUsers
  const allUsers: AppUserProfile[] = authorizedUsers.map((u) => ({
    uid: `auth-${u.email}`,
    email: u.email,
    displayName: u.name,
    role: u.role,
    createdAt: u.authorizedAt,
  }));

  return {
    currentUser,
    setCurrentUser,
    authResolved,
    allUsers,
    authorizedUsers,
    authErrorMessage,
    handleLogout,
    handleLoginSuccess,
    isAdmin: currentUser?.role === 'admin',
    isPendente: false,
  };
}

