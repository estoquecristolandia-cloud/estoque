import React, { useState, useEffect } from 'react';
import { INITIAL_PRODUCTS } from './data/initialData';
import { Product, StockMovement, DailyKit, EntryType, Sector, Missionary } from './types';
import {
  getStoredProducts,
  saveProducts,
  getStoredMovements,
  saveMovements,
  getStoredDailyKit,
  saveDailyKit,
  getStoredMissionaries,
  saveMissionaries,
  resetAllDataToDefault,
  addEntryMovement,
  addExitMovement,
  addBatchExitMovements,
  updateStockMovement,
  deleteStockMovement,
  executeDailyKitDelivery,
} from './utils/storage';

import { 
  auth, 
  getUserProfile, 
  createUserProfile, 
  AppUserProfile, 
  UserRole 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  subscribeToProducts,
  subscribeToMovements,
  subscribeToDailyKit,
  subscribeToUsers,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveMovementToFirestore,
  saveDailyKitToFirestore,
  saveProductsAndMovementsInFirestore,
  seedInitialFirestoreDataIfEmpty,
} from './services/firestoreService';

import { Header } from './components/Header';
import { HeroAlertBanner } from './components/HeroAlertBanner';
import { KpiCards } from './components/KpiCards';
import { CurrentStockOverview } from './components/CurrentStockOverview';
import { DashboardCharts } from './components/DashboardCharts';
import { ProductTimelineModal } from './components/ProductTimelineModal';
import { EntryModal } from './components/EntryModal';
import { ExitModal } from './components/ExitModal';
import { DailyKitModal } from './components/DailyKitModal';
import { ProductManager } from './components/ProductManager';
import { MovementsHistory } from './components/MovementsHistory';
import { ReportsView } from './components/ReportsView';
import { AuthModal } from './components/AuthModal';
import { MissionaryManagerModal } from './components/MissionaryManagerModal';

import { CheckCircle, AlertTriangle, Info, Utensils } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<Product[]>(getStoredProducts());
  const [movements, setMovements] = useState<StockMovement[]>(getStoredMovements());
  const [dailyKit, setDailyKit] = useState<DailyKit>(getStoredDailyKit());
  const [missionaries, setMissionaries] = useState<Missionary[]>(getStoredMissionaries());

  // User & Auth State
  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>({
    uid: 'local-admin',
    email: 'Acesso por Usuário',
    displayName: 'Administrador Cristolândia',
    role: 'admin',
    createdAt: new Date().toISOString(),
  });
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'entries' | 'exits' | 'reports'>('dashboard');

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [isMissionariesModalOpen, setIsMissionariesModalOpen] = useState(false);
  const [timelineProduct, setTimelineProduct] = useState<Product | null>(null);
  const [selectedProductForAction, setSelectedProductForAction] = useState<Product | null>(null);
  const [actionInitialDate, setActionInitialDate] = useState<string | null>(null);

  const handleSaveMissionaries = (updated: Missionary[]) => {
    setMissionaries(updated);
    saveMissionaries(updated);
    setToast({ message: 'Lista de missionários e turnos atualizada!', type: 'success' });
  };

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Initialize Firebase Real-Time Firestore Sync
  useEffect(() => {
    // Seed initial data if Firestore is empty
    seedInitialFirestoreDataIfEmpty();

    // Subscribe to products
    const unsubProds = subscribeToProducts((realtimeProducts) => {
      if (realtimeProducts.length > 0) {
        const validIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
        const filtered = realtimeProducts.filter((p) => validIds.has(p.id));
        setProducts(filtered);
        saveProducts(filtered);
      }
    });

    // Subscribe to movements
    const unsubMovs = subscribeToMovements((realtimeMovements) => {
      const validProdIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
      const filtered = realtimeMovements.filter((m) => validProdIds.has(m.productId));
      setMovements(filtered);
      saveMovements(filtered);
    });

    // Subscribe to daily kit
    const unsubKit = subscribeToDailyKit((realtimeKit) => {
      if (realtimeKit) {
        setDailyKit(realtimeKit);
        saveDailyKit(realtimeKit);
      }
    });

    // Subscribe to users
    const unsubUsers = subscribeToUsers((usersList) => {
      setAllUsers(usersList);
    });

    // Firebase Auth State Listener
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          profile = await createUserProfile(user, 'admin');
        }
        setCurrentUser(profile);
      }
    });

    return () => {
      unsubProds();
      unsubMovs();
      unsubKit();
      unsubUsers();
      unsubAuth();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleSelectLocalRole = (role: UserRole) => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        role,
      });
      showToast(`Perfil alterado para: ${role.toUpperCase()}`, 'info');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Tem certeza que deseja redefinir todos os dados para a demonstração padrão da Cristolândia?')) {
      const { products: defaultProds, movements: defaultMovs } = resetAllDataToDefault();
      setProducts(defaultProds);
      setMovements(defaultMovs);
      saveProductsAndMovementsInFirestore(defaultProds, defaultMovs);
      showToast('Dados redefinidos e sincronizados com o banco online!', 'info');
    }
  };

  // Handlers
  const handleOpenEntryModal = (product?: Product | null, initialDate?: string | null) => {
    setSelectedProductForAction(product || null);
    setActionInitialDate(initialDate || null);
    setIsEntryModalOpen(true);
  };

  const handleOpenExitModal = (product?: Product | null, initialDate?: string | null) => {
    setSelectedProductForAction(product || null);
    setActionInitialDate(initialDate || null);
    setIsExitModalOpen(true);
  };

  const handleOpenTimeline = (product: Product) => {
    setTimelineProduct(product);
  };

  const handleOpenTimelineById = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    if (p) {
      setTimelineProduct(p);
    }
  };

  // Execute Entry Submission with Realtime Firestore Persistence
  const handleAddEntry = async (
    product: Product,
    quantity: number,
    entryType: EntryType,
    supplierOrDonor: string,
    receivedBy: string,
    date: string,
    time: string,
    notes: string
  ) => {
    try {
      const { updatedProducts, updatedMovements } = addEntryMovement(
        product,
        quantity,
        entryType,
        supplierOrDonor,
        receivedBy,
        date,
        time,
        notes,
        products,
        movements
      );

      setProducts(updatedProducts);
      setMovements(updatedMovements);

      // Firestore Realtime Write
      const updatedProd = updatedProducts.find((p) => p.id === product.id);
      if (updatedProd) {
        await saveProductToFirestore(updatedProd);
      }
      if (updatedMovements[0]) {
        await saveMovementToFirestore(updatedMovements[0]);
      }

      showToast(`+ ${quantity} ${product.unit} de ${product.name} adicionado ao estoque (${entryType})!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar entrada', 'warning');
    }
  };

  // Execute Exit Submission with Realtime Firestore Persistence
  const handleAddExit = async (
    product: Product,
    quantity: number,
    sector: Sector,
    retrievedBy: string,
    deliveredBy: string,
    date: string,
    time: string,
    notes: string
  ) => {
    try {
      const { updatedProducts, updatedMovements } = addExitMovement(
        product,
        quantity,
        sector,
        retrievedBy,
        deliveredBy,
        date,
        time,
        notes,
        products,
        movements
      );

      setProducts(updatedProducts);
      setMovements(updatedMovements);

      // Firestore Realtime Write
      const updatedProd = updatedProducts.find((p) => p.id === product.id);
      if (updatedProd) {
        await saveProductToFirestore(updatedProd);
      }
      if (updatedMovements[0]) {
        await saveMovementToFirestore(updatedMovements[0]);
      }

      showToast(`- ${quantity} ${product.unit} de ${product.name} entregue para ${sector}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar saída', 'warning');
    }
  };

  const handleAddBatchExit = async (
    items: Array<{ product: Product; quantity: number }>,
    sector: Sector,
    retrievedBy: string,
    deliveredBy: string,
    date: string,
    time: string,
    notes: string
  ) => {
    try {
      const { updatedProducts, updatedMovements } = addBatchExitMovements(
        items,
        sector,
        retrievedBy,
        deliveredBy,
        date,
        time,
        notes,
        products,
        movements
      );

      setProducts(updatedProducts);
      setMovements(updatedMovements);

      // Firestore Batch Write
      await saveProductsAndMovementsInFirestore(updatedProducts, updatedMovements);

      const itemsSummary = items.map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(', ');
      showToast(`Saída de ${items.length} item(ns) realizada com sucesso para ${sector}! (${itemsSummary})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar saída de itens', 'warning');
    }
  };

  const handleUpdateMovement = async (
    movementId: string,
    updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }
  ) => {
    try {
      const { updatedProducts, updatedMovements } = updateStockMovement(
        movementId,
        updatedData,
        products,
        movements
      );

      setProducts(updatedProducts);
      setMovements(updatedMovements);

      await saveProductsAndMovementsInFirestore(updatedProducts, updatedMovements);

      showToast('Movimentação atualizada! Estoque recalculado com sucesso.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar movimentação', 'warning');
    }
  };

  const handleDeleteMovement = async (movementId: string) => {
    try {
      const { updatedProducts, updatedMovements } = deleteStockMovement(
        movementId,
        products,
        movements
      );

      setProducts(updatedProducts);
      setMovements(updatedMovements);

      await saveProductsAndMovementsInFirestore(updatedProducts, updatedMovements);

      showToast('Movimentação excluída e saldo de estoque estornado!', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir movimentação', 'warning');
    }
  };

  // Execute Daily Kitchen Kit Delivery with Realtime Firestore Persistence
  const handleDeliverKit = async (
    kitToDeliver: DailyKit,
    retrievedBy: string,
    deliveredBy: string,
    date: string,
    time: string,
    saveAsDefault?: boolean
  ) => {
    if (saveAsDefault) {
      saveDailyKit(kitToDeliver);
      setDailyKit(kitToDeliver);
      await saveDailyKitToFirestore(kitToDeliver);
    }

    const { updatedProducts, updatedMovements, deliveredCount, warnings } = executeDailyKitDelivery(
      kitToDeliver,
      retrievedBy,
      deliveredBy,
      date,
      time,
      products,
      movements
    );

    setProducts(updatedProducts);
    setMovements(updatedMovements);

    // Save batch changes online
    await saveProductsAndMovementsInFirestore(updatedProducts, updatedMovements);

    if (warnings.length > 0) {
      showToast(`Kit Entregue com ${deliveredCount} item(ns). Avisos: ${warnings[0]}`, 'warning');
    } else {
      showToast(`⚡ Kit Diário da Cozinha baixado com sucesso! (${deliveredCount} itens atualizados)${saveAsDefault ? ' - Novo modelo padrão salvo!' : ''}`, 'success');
    }
  };

  const handleSaveProduct = async (updatedProd: Product) => {
    const updated = products.map((p) => (p.id === updatedProd.id ? updatedProd : p));
    setProducts(updated);
    saveProducts(updated);
    await saveProductToFirestore(updatedProd);
    showToast(`Produto ${updatedProd.name} atualizado e sincronizado online!`, 'info');
  };

  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'lastUpdated'>) => {
    const newProd: Product = {
      ...newProdData,
      id: `prod-${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };
    const updated = [newProd, ...products];
    setProducts(updated);
    saveProducts(updated);
    await saveProductToFirestore(newProd);
    showToast(`Novo produto ${newProd.name} cadastrado com sucesso!`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row selection:bg-blue-600 selection:text-white">
      {/* Bento Desktop Sidebar / Mobile Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenKitModal={() => setIsKitModalOpen(true)}
        onOpenMissionariesModal={() => setIsMissionariesModalOpen(true)}
        onResetData={handleResetData}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold animate-bounce-short ${
              toast.type === 'success'
                ? 'bg-emerald-950 border-emerald-600 text-emerald-200'
                : toast.type === 'warning'
                ? 'bg-amber-950 border-amber-600 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Smart Header / Status Bar */}
            <HeroAlertBanner
              products={products}
              dailyKit={dailyKit}
              onOpenEntryModal={() => handleOpenEntryModal(null)}
              onOpenExitModal={() => handleOpenExitModal(null)}
              onOpenKitModal={() => setIsKitModalOpen(true)}
              onOpenReports={() => setActiveTab('reports')}
            />

            {/* Bento Grid KPI & Inventory Gauges */}
            <KpiCards
              products={products}
              onSelectCategoryFilter={(filter) => {
                setActiveTab('products');
              }}
            />

            {/* Quadro Geral de Controle de Estoque Atual em Tempo Real */}
            <CurrentStockOverview
              products={products}
              onOpenEntry={(prod) => handleOpenEntryModal(prod)}
              onOpenExit={(prod) => handleOpenExitModal(prod)}
              onOpenTimeline={(productId) => handleOpenTimelineById(productId)}
            />

            {/* Visual Charts Analytics Hub */}
            <DashboardCharts products={products} movements={movements} />

            {/* Recent Activity Feed Bento Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Feed de Últimas Movimentações em Tempo Real
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Últimas entradas (compras/doações) e saídas para a Cozinha, Padaria e Casas Missionárias.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('entries')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>Ver Histórico Completo</span>
                  <span>&rarr;</span>
                </button>
              </div>

              <MovementsHistory
                movements={movements.slice(0, 6)}
                products={products}
                onOpenProductTimeline={handleOpenTimelineById}
                onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)}
                onOpenExitForDate={(d) => handleOpenExitModal(null, d)}
                onUpdateMovement={handleUpdateMovement}
                onDeleteMovement={handleDeleteMovement}
              />
            </div>
          </div>
        )}

        {/* 2. PRODUCTS & TIMELINE TAB */}
        {activeTab === 'products' && (
          <ProductManager
            products={products}
            onOpenTimeline={handleOpenTimeline}
            onOpenEntry={(p) => handleOpenEntryModal(p)}
            onOpenExit={(p) => handleOpenExitModal(p)}
            onSaveProduct={handleSaveProduct}
            onAddProduct={handleAddProduct}
            userRole={currentUser?.role}
          />
        )}

        {/* 3. ENTRIES TAB */}
        {activeTab === 'entries' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Entradas no Estoque (Compras e Doações)</h2>
                <p className="text-xs text-slate-500">Rastreio de todos os mantimentos recebidos na Cristolândia</p>
              </div>
              <button
                onClick={() => handleOpenEntryModal(null)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer"
              >
                + Nova Entrada
              </button>
            </div>

            <MovementsHistory
              movements={movements.filter((m) => m.type === 'entrada')}
              products={products}
              onOpenProductTimeline={handleOpenTimelineById}
              onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)}
              onOpenExitForDate={(d) => handleOpenExitModal(null, d)}
              onUpdateMovement={handleUpdateMovement}
              onDeleteMovement={handleDeleteMovement}
            />
          </div>
        )}

        {/* 4. EXITS BY SECTOR TAB */}
        {activeTab === 'exits' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Saídas do Estoque por Setor</h2>
                <p className="text-xs text-slate-500">Entrega de mantimentos para a Cozinha, Casa Masculina, Casa Feminina e Eventos</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsKitModalOpen(true)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <Utensils className="w-4 h-4" />
                  <span>+ Kit Cozinha Diário</span>
                </button>

                <button
                  onClick={() => handleOpenExitModal(null)}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer"
                >
                  Nova Saída
                </button>
              </div>
            </div>

            <MovementsHistory
              movements={movements.filter((m) => m.type === 'saida')}
              products={products}
              onOpenProductTimeline={handleOpenTimelineById}
              onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)}
              onOpenExitForDate={(d) => handleOpenExitModal(null, d)}
              onUpdateMovement={handleUpdateMovement}
              onDeleteMovement={handleDeleteMovement}
            />
          </div>
        )}

        {/* 5. REPORTS TAB */}
        {activeTab === 'reports' && (
          <ReportsView products={products} movements={movements} />
        )}
      </main>

      {/* MODALS */}
      {/* 1. Product Timeline Modal */}
      {timelineProduct && (
        <ProductTimelineModal
          product={timelineProduct}
          movements={movements}
          onClose={() => setTimelineProduct(null)}
          onOpenEntry={(p) => handleOpenEntryModal(p)}
          onOpenExit={(p) => handleOpenExitModal(p)}
        />
      )}

      {/* 2. Entry Modal */}
      {isEntryModalOpen && (
        <EntryModal
          products={products}
          selectedProduct={selectedProductForAction}
          initialDate={actionInitialDate || undefined}
          onClose={() => {
            setIsEntryModalOpen(false);
            setSelectedProductForAction(null);
            setActionInitialDate(null);
          }}
          onSubmit={handleAddEntry}
        />
      )}

      {/* 3. Exit Modal */}
      {isExitModalOpen && (
        <ExitModal
          products={products}
          selectedProduct={selectedProductForAction}
          initialDate={actionInitialDate || undefined}
          missionaries={missionaries}
          onClose={() => {
            setIsExitModalOpen(false);
            setSelectedProductForAction(null);
            setActionInitialDate(null);
          }}
          onSubmitBatch={handleAddBatchExit}
          onSubmit={handleAddExit}
        />
      )}

      {/* 4. Daily Kit Modal */}
      {isKitModalOpen && (
        <DailyKitModal
          products={products}
          kit={dailyKit}
          missionaries={missionaries}
          onClose={() => setIsKitModalOpen(false)}
          onSubmitKit={handleDeliverKit}
        />
      )}

      {/* 5. Missionary & Shifts Management Modal */}
      <MissionaryManagerModal
        isOpen={isMissionariesModalOpen}
        onClose={() => setIsMissionariesModalOpen(false)}
        missionaries={missionaries}
        onSaveMissionaries={handleSaveMissionaries}
      />

      {/* 6. Auth & Roles Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectRole={handleSelectLocalRole}
        onRefreshProfile={async () => {
          if (auth.currentUser) {
            const p = await getUserProfile(auth.currentUser.uid);
            if (p) setCurrentUser(p);
          }
        }}
      />
    </div>
  );
}
