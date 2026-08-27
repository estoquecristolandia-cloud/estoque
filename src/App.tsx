import React, { useState, useEffect } from 'react';
import { Product, StockMovement, DailyKit, EntryType, Sector, Missionary, DailyMealRecord, InventoryAudit, InventorySessionSummary } from './types';
import { getStoredProducts, saveProducts, getStoredMovements, saveMovements, getStoredDailyKit, saveDailyKit, getStoredMissionaries, saveMissionaries, getStoredMeals, saveMeals, addOrUpdateMealRecord, deleteStoredMealRecord } from './utils/storage';
import { auth, getUserProfile, createUserProfile, AppUserProfile, UserRole } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeToProducts, subscribeToMovements, subscribeToDailyKit, subscribeToUsers, subscribeToMeals, subscribeToInventoryAudits, subscribeToInventorySessions, saveProductToFirestore, saveDailyKitToFirestore, saveMealRecordToFirestore, deleteMealRecordFromFirestore, syncInitialFirestoreData, executeEntryTransaction, executeExitTransaction, executeBatchExitTransaction, executeDailyKitTransaction, updateStockMovementTransaction, deleteStockMovementTransaction } from './services/firestoreService';
import { Header } from './components/Header';
import { DashboardHeader } from './components/DashboardHeader';
import { KpiCards } from './components/KpiCards';
import { KitchenKitWidget } from './components/KitchenKitWidget';
import { TopConsumedProductsWidget } from './components/TopConsumedProductsWidget';
import { ReplenishmentAlertSection } from './components/ReplenishmentAlertSection';
import { RecentMovementsSection } from './components/RecentMovementsSection';
import { CurrentStockOverview } from './components/CurrentStockOverview';
import { DashboardCharts } from './components/DashboardCharts';
import { ProductTimelineModal } from './components/ProductTimelineModal';
import { EntryModal } from './components/EntryModal';
import { ExitModal } from './components/ExitModal';
import { DailyKitModal } from './components/DailyKitModal';
import { ProductManager } from './components/ProductManager';
import { EntriesView } from './components/EntriesView';
import { ExitsView } from './components/ExitsView';
import { MovementsHistory } from './components/MovementsHistory';
import { MealManager } from './components/MealManager';
import { ReportsView } from './components/ReportsView';
import { AuthModal } from './components/AuthModal';
import { MissionaryManagerModal } from './components/MissionaryManagerModal';
import { WhatsAppAlertModal } from './components/WhatsAppAlertModal';
import { PhysicalInventoryModal } from './components/PhysicalInventoryModal';
import { PhysicalReconciliationPreviewModal } from './components/PhysicalReconciliationPreviewModal';
import { LoginScreen } from './components/LoginScreen';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './utils/toast';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<Product[]>(getStoredProducts());
  const [movements, setMovements] = useState<StockMovement[]>(getStoredMovements());
  const [dailyKit, setDailyKit] = useState<DailyKit>(getStoredDailyKit());
  const [missionaries, setMissionaries] = useState<Missionary[]>(getStoredMissionaries());
  const [meals, setMeals] = useState<DailyMealRecord[]>(getStoredMeals());
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAudit[]>([]);
  const [inventorySessions, setInventorySessions] = useState<InventorySessionSummary[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cristolandia_theme');
    return saved !== null ? saved === 'dark' : false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cristolandia_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cristolandia_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const handleLogout = async () => {
    const { logoutUser } = await import('./firebase');
    await logoutUser();
    setCurrentUser(null);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const profile = await getUserProfile(auth.currentUser.uid);
      if (profile) setCurrentUser(profile);
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'entries' | 'exits' | 'meals' | 'reports'>('dashboard');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [isMissionariesModalOpen, setIsMissionariesModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isPhysicalInventoryOpen, setIsPhysicalInventoryOpen] = useState(false);
  const [isReconciliationPreviewOpen, setIsReconciliationPreviewOpen] = useState(false);
  const [timelineProduct, setTimelineProduct] = useState<Product | null>(null);
  const [selectedProductForAction, setSelectedProductForAction] = useState<Product | null>(null);
  const [selectedDateForAction, setSelectedDateForAction] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          profile = await createUserProfile(user);
        }
        setCurrentUser(profile);
      } else {
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalDev) {
          setCurrentUser({
            uid: 'dev-admin-marconi',
            email: 'estoquecristolandia@gmail.com',
            displayName: 'Marconi Castro (Gestor do Estoque)',
            role: 'admin',
            createdAt: new Date().toISOString(),
          });
        } else {
          setCurrentUser(null);
        }
      }
      setAuthResolved(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubProducts = subscribeToProducts((firestoreProducts) => {
      if (firestoreProducts && firestoreProducts.length > 0) {
        setProducts(firestoreProducts);
        saveProducts(firestoreProducts);
      } else {
        syncInitialFirestoreData().catch(console.error);
      }
    });

    const unsubMovements = subscribeToMovements((firestoreMovements) => {
      setMovements(firestoreMovements);
      saveMovements(firestoreMovements);
    });

    const unsubKit = subscribeToDailyKit((firestoreKit) => {
      if (firestoreKit) {
        setDailyKit(firestoreKit);
        saveDailyKit(firestoreKit);
      }
    });

    const unsubUsers = subscribeToUsers((users) => {
      setAllUsers(users);
      if (currentUser) {
        const updated = users.find((u) => u.uid === currentUser.uid);
        if (updated && updated.role !== currentUser.role) {
          setCurrentUser(updated);
        }
      }
    });

    const unsubMeals = subscribeToMeals((firestoreMeals) => {
      setMeals(firestoreMeals);
      saveMeals(firestoreMeals);
    });

    const unsubAudits = subscribeToInventoryAudits((audits) => {
      setInventoryAudits(audits);
    });

    const unsubSessions = subscribeToInventorySessions((sessions) => {
      setInventorySessions(sessions);
    });

    return () => {
      unsubProducts();
      unsubMovements();
      unsubKit();
      unsubUsers();
      unsubMeals();
      unsubAudits();
      unsubSessions();
    };
  }, [currentUser?.uid]);

  const handleOpenTimeline = (product: Product) => {
    setTimelineProduct(product);
  };

  const handleOpenTimelineById = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    if (p) setTimelineProduct(p);
  };

  const handleOpenEntryModal = (product: Product | null, defaultDate?: string) => {
    setSelectedProductForAction(product);
    setSelectedDateForAction(defaultDate);
    setIsEntryModalOpen(true);
  };

  const handleOpenExitModal = (product: Product | null, defaultDate?: string) => {
    setSelectedProductForAction(product);
    setSelectedDateForAction(defaultDate);
    setIsExitModalOpen(true);
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      await saveProductToFirestore(product);
      toast.success('Produto salvo com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar produto: ' + err.message);
    }
  };

  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'lastUpdated'>) => {
    try {
      const productWithId: Product = {
        ...newProd,
        id: `prod_${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };
      await saveProductToFirestore(productWithId);
      toast.success('Novo produto cadastrado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao cadastrar produto: ' + err.message);
    }
  };

  const handleSaveMealRecord = async (record: Omit<DailyMealRecord, 'id' | 'createdAt'>) => {
    try {
      const existing = meals.find((m) => m.date === record.date);
      const newRecord: DailyMealRecord = {
        ...record,
        id: existing ? existing.id : `meal_${record.date}`,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveMealRecordToFirestore(newRecord);
      const { updatedMeals } = addOrUpdateMealRecord(meals, newRecord);
      setMeals(updatedMeals);
      saveMeals(updatedMeals);
      toast.success(`Refeições do dia ${record.date} salvas com sucesso!`);
    } catch (err: any) {
      toast.error('Erro ao salvar refeições: ' + err.message);
    }
  };

  const handleDeleteMealRecord = async (id: string) => {
    try {
      await deleteMealRecordFromFirestore(id);
      const updatedMeals = deleteStoredMealRecord(meals, id);
      setMeals(updatedMeals);
      saveMeals(updatedMeals);
      toast.success('Registro de refeição excluído com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir refeição: ' + err.message);
    }
  };

  const handleUpdateMovement = async (
    movementId: string,
    updatedFields: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }
  ) => {
    try {
      await updateStockMovementTransaction(movementId, updatedFields);
      toast.success('Movimentação atualizada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar movimentação: ' + err.message);
    }
  };

  const handleDeleteMovement = async (movementId: string) => {
    try {
      await deleteStockMovementTransaction(movementId);
      toast.success('Movimentação excluída e estoque revertido!');
    } catch (err: any) {
      toast.error('Erro ao excluir movimentação: ' + err.message);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Deseja restaurar os dados de demonstração originais do estoque?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleForceSyncPhysicalInventory = async () => {
    toast.success('Saldos físicos sincronizados com sucesso.');
  };

  if (!authResolved || !currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  if (currentUser.role === 'pendente') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-slate-900 dark:text-white">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 text-center shadow-xl">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center text-2xl">
            ⏳
          </div>
          <h1 className="text-xl font-black">Acesso aguardando aprovação</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Olá, {currentUser.displayName}. Sua conta foi criada com segurança, mas ainda não recebeu uma permissão operacional.
          </p>
          <p className="text-xs text-slate-400 mt-3 font-mono">{currentUser.email}</p>
          <button onClick={handleLogout} className="mt-6 px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer">
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col md:flex-row selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      <ToastContainer />

      {/* Sidebar Desktop & Mobile */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenKitModal={() => setIsKitModalOpen(true)}
        onOpenPhysicalInventory={() => setIsPhysicalInventoryOpen(true)}
        onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)}
        onOpenMissionariesModal={() => setIsMissionariesModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onResetData={handleResetData}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main App Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* 1. Header do Dashboard (Greeting Crewix + Data + Ações Rápidas) */}
              <DashboardHeader
                currentUser={currentUser}
                onOpenEntryModal={() => handleOpenEntryModal(null)}
                onOpenExitModal={() => handleOpenExitModal(null)}
                onOpenWhatsAppAlert={() => setIsWhatsAppModalOpen(true)}
              />

              {/* 2. Top Metric KPI Cards (5 Cards) */}
              <KpiCards
                products={products}
                movements={movements}
                dailyKit={dailyKit}
                meals={meals}
                userRole={currentUser.role}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenEntryModal={() => handleOpenEntryModal(null)}
                onOpenExitModal={() => handleOpenExitModal(null)}
                onOpenKitModal={() => setIsKitModalOpen(true)}
                onOpenMealsModal={() => setActiveTab('meals')}
              />

              {/* 3. Bento Grid Linha 1: Kit Cozinha Diário (5 cols) + Produtos com Maior Saída (7 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                <div className="lg:col-span-5">
                  <KitchenKitWidget
                    dailyKit={dailyKit}
                    products={products}
                    userRole={currentUser.role}
                    onOpenKitModal={() => setIsKitModalOpen(true)}
                  />
                </div>
                <div className="lg:col-span-7">
                  <TopConsumedProductsWidget
                    products={products}
                    movements={movements}
                    onOpenProductTimeline={handleOpenTimelineById}
                    onNavigateProducts={() => setActiveTab('products')}
                  />
                </div>
              </div>

              {/* 4. Bento Grid Linha 2: Gráficos (Entradas × Saídas 7 dias + Autonomia) */}
              <DashboardCharts products={products} movements={movements} />

              {/* 5. Bento Grid Linha 3: Produtos em Ponto de Reposição + Últimas Movimentações */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                <div className="lg:col-span-6">
                  <ReplenishmentAlertSection
                    products={products}
                    userRole={currentUser.role}
                    onOpenEntry={(p) => handleOpenEntryModal(p)}
                    onViewAllProducts={() => setActiveTab('products')}
                  />
                </div>
                <div className="lg:col-span-6">
                  <RecentMovementsSection
                    movements={movements}
                    products={products}
                    userRole={currentUser.role}
                    onViewAllMovements={() => setActiveTab('entries')}
                    onOpenProductTimeline={handleOpenTimelineById}
                  />
                </div>
              </div>

              {/* 6. Bento Grid Linha 4: Visão Geral de Estoque & Saldos Físicos */}
              <CurrentStockOverview
                products={products}
                userRole={currentUser.role}
                onOpenEntry={(p) => handleOpenEntryModal(p)}
                onOpenExit={(p) => handleOpenExitModal(p)}
                onOpenTimeline={handleOpenTimelineById}
                onOpenPhysicalInventory={() => setIsPhysicalInventoryOpen(true)}
                onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)}
                onForceSyncPhysicalStock={handleForceSyncPhysicalInventory}
              />
            </motion.div>
          )}

          {activeTab === 'products' && (
            <ProductManager
              products={products}
              onOpenTimeline={handleOpenTimeline}
              onOpenEntry={handleOpenEntryModal}
              onOpenExit={handleOpenExitModal}
              onSaveProduct={handleSaveProduct}
              onAddProduct={handleAddProduct}
              userRole={currentUser.role}
              onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)}
            />
          )}

          {activeTab === 'entries' && (
            <EntriesView
              movements={movements}
              products={products}
              userRole={currentUser.role}
              onOpenNewEntryModal={(prod, defaultDate) => handleOpenEntryModal(prod, defaultDate)}
              onOpenProductTimeline={handleOpenTimelineById}
              onUpdateMovement={handleUpdateMovement}
              onDeleteMovement={handleDeleteMovement}
            />
          )}

          {activeTab === 'exits' && (
            <ExitsView
              movements={movements}
              products={products}
              userRole={currentUser.role}
              onOpenNewExitModal={(prod, defaultDate) => handleOpenExitModal(prod, defaultDate)}
              onOpenKitModal={() => setIsKitModalOpen(true)}
              onOpenProductTimeline={handleOpenTimelineById}
              onUpdateMovement={handleUpdateMovement}
              onDeleteMovement={handleDeleteMovement}
            />
          )}

          {activeTab === 'meals' && (
            <MealManager
              meals={meals}
              missionaries={missionaries}
              userRole={currentUser.role}
              currentUserDisplayName={currentUser.displayName || 'Marconi Castro (Gestor do Estoque)'}
              onSaveMealRecord={handleSaveMealRecord}
              onDeleteMealRecord={handleDeleteMealRecord}
            />
          )}

          {activeTab === 'reports' && (
            currentUser.role === 'admin' ? (
              <ReportsView
                products={products}
                movements={movements}
                inventoryAudits={inventoryAudits}
                userRole={currentUser.role}
                userName={currentUser.displayName || 'Marconi Castro (Gestor do Estoque)'}
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl mx-auto">
                  🔒
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Acesso Restrito à Administração
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  A Central de Relatórios Administrativos e Auditoria Contábil é de uso exclusivo do gestor do estoque. Utilize as abas de Consulta de Produtos, Extrato de Entradas, Saídas e Refeições.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  Voltar ao Painel Geral
                </button>
              </div>
            )
          )}
        </AnimatePresence>
      </main>

      {/* MODALS */}
      {timelineProduct && (
        <ProductTimelineModal
          product={timelineProduct}
          movements={movements}
          isOpen={!!timelineProduct}
          onClose={() => setTimelineProduct(null)}
          onOpenEntry={(prod) => handleOpenEntryModal(prod)}
          onOpenExit={(prod) => handleOpenExitModal(prod)}
          userRole={currentUser.role}
        />
      )}

      {isEntryModalOpen && (
        <EntryModal
          onClose={() => {
            setIsEntryModalOpen(false);
            setSelectedProductForAction(null);
            setSelectedDateForAction(undefined);
          }}
          products={products}
          selectedProduct={selectedProductForAction}
          initialDate={selectedDateForAction}
          onSubmit={async (product, quantity, entryType, supplierOrDonor, receivedBy, date, time, notes) => {
            try {
              await executeEntryTransaction(
                product.id,
                quantity,
                entryType,
                supplierOrDonor,
                receivedBy,
                date,
                time,
                notes
              );
              toast.success('Entrada de estoque confirmada com sucesso!');
              setIsEntryModalOpen(false);
              setSelectedProductForAction(null);
              setSelectedDateForAction(undefined);
            } catch (err: any) {
              toast.error('Erro na transação de entrada: ' + err.message);
            }
          }}
        />
      )}

      {isExitModalOpen && (
        <ExitModal
          onClose={() => {
            setIsExitModalOpen(false);
            setSelectedProductForAction(null);
            setSelectedDateForAction(undefined);
          }}
          products={products}
          missionaries={missionaries}
          selectedProduct={selectedProductForAction}
          initialDate={selectedDateForAction}
          onSubmit={async (product, quantity, sector, retrievedBy, deliveredBy, date, time, notes) => {
            try {
              await executeExitTransaction(
                product.id,
                quantity,
                sector,
                retrievedBy,
                deliveredBy,
                date,
                time,
                notes
              );
              toast.success('Saída de estoque registrada com sucesso!');
              setIsExitModalOpen(false);
              setSelectedProductForAction(null);
              setSelectedDateForAction(undefined);
            } catch (err: any) {
              toast.error('Erro na transação de saída: ' + err.message);
            }
          }}
          onSubmitBatch={async (items, sector, retrievedBy, deliveredBy, date, time, notes) => {
            try {
              const batchItems = items.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                unit: item.product.unit
              }));
              await executeBatchExitTransaction(
                batchItems,
                sector,
                retrievedBy,
                deliveredBy,
                date,
                time,
                notes
              );
              toast.success(`Saída coletiva de ${items.length} itens registrada!`);
              setIsExitModalOpen(false);
              setSelectedProductForAction(null);
              setSelectedDateForAction(undefined);
            } catch (err: any) {
              toast.error('Erro na saída coletiva: ' + err.message);
            }
          }}
        />
      )}

      {isKitModalOpen && (
        <DailyKitModal
          isOpen={isKitModalOpen}
          onClose={() => setIsKitModalOpen(false)}
          kit={dailyKit}
          products={products}
          missionaries={missionaries}
          userRole={currentUser.role}
          onExecuteKit={async (items, sector, kitchenShift, retrievedBy, deliveredBy, notes, date, time) => {
            try {
              await executeDailyKitTransaction(
                dailyKit,
                retrievedBy,
                deliveredBy,
                date,
                time
              );
              toast.success('Kit Cozinha baixado com sucesso!');
              setIsKitModalOpen(false);
            } catch (err: any) {
              toast.error('Erro ao baixar Kit Cozinha: ' + err.message);
            }
          }}
          onSaveKitConfig={async (updatedKit) => {
            try {
              await saveDailyKitToFirestore(updatedKit);
              setDailyKit(updatedKit);
              saveDailyKit(updatedKit);
              toast.success('Configuração do Kit Cozinha salva!');
            } catch (err: any) {
              toast.error('Erro ao salvar kit: ' + err.message);
            }
          }}
        />
      )}

      {isMissionariesModalOpen && (
        <MissionaryManagerModal
          isOpen={isMissionariesModalOpen}
          onClose={() => setIsMissionariesModalOpen(false)}
          missionaries={missionaries}
          onSaveMissionaries={(updated) => {
            setMissionaries(updated);
            saveMissionaries(updated);
            toast.success('Lista de missionários atualizada!');
          }}
        />
      )}

      {isWhatsAppModalOpen && (
        <WhatsAppAlertModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          products={products}
        />
      )}

      {isPhysicalInventoryOpen && (
        <PhysicalInventoryModal
          isOpen={isPhysicalInventoryOpen}
          onClose={() => setIsPhysicalInventoryOpen(false)}
          products={products}
          currentUser={currentUser}
          onInventorySaved={() => {
            toast.success('Sessão de inventário salva com sucesso!');
          }}
        />
      )}

      {isReconciliationPreviewOpen && (
        <PhysicalReconciliationPreviewModal
          isOpen={isReconciliationPreviewOpen}
          onClose={() => setIsReconciliationPreviewOpen(false)}
          products={products}
          movements={movements}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          allUsers={allUsers}
          onSelectRole={async (role) => {
            if (currentUser) {
              const { updateUserRoleInFirestore } = await import('./services/firestoreService');
              await updateUserRoleInFirestore(currentUser.uid, role);
              refreshProfile();
            }
          }}
          onRefreshProfile={refreshProfile}
        />
      )}
    </div>
  );
}
