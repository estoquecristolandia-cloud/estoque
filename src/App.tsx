import React, { useState, useEffect } from 'react';
import { Product, StockMovement, DailyKit, EntryType, Sector, Missionary, DailyMealRecord, InventoryAudit, InventorySessionSummary } from './types';
import { getStoredProducts, saveProducts, getStoredMovements, saveMovements, getStoredDailyKit, saveDailyKit, getStoredMissionaries, saveMissionaries, getStoredMeals, saveMeals, addOrUpdateMealRecord, deleteStoredMealRecord } from './utils/storage';
import { auth, getUserProfile, createUserProfile, AppUserProfile, UserRole } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeToProducts, subscribeToMovements, subscribeToDailyKit, subscribeToUsers, subscribeToMeals, subscribeToInventoryAudits, subscribeToInventorySessions, saveProductToFirestore, saveDailyKitToFirestore, saveMealRecordToFirestore, deleteMealRecordFromFirestore, syncInitialFirestoreData, executeEntryTransaction, executeExitTransaction, executeBatchExitTransaction, executeDailyKitTransaction, updateStockMovementTransaction, deleteStockMovementTransaction } from './services/firestoreService';
import { Header } from './components/Header';
import { HeroAlertBanner } from './components/HeroAlertBanner';
import { KpiCards } from './components/KpiCards';
import { ReplenishmentAlertSection } from './components/ReplenishmentAlertSection';
import { RecentMovementsSection } from './components/RecentMovementsSection';
import { CurrentStockOverview } from './components/CurrentStockOverview';
import { DashboardCharts } from './components/DashboardCharts';
import { ProductTimelineModal } from './components/ProductTimelineModal';
import { EntryModal } from './components/EntryModal';
import { ExitModal } from './components/ExitModal';
import { DailyKitModal } from './components/DailyKitModal';
import { ProductManager } from './components/ProductManager';
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => { const saved = localStorage.getItem('cristolandia_theme'); return saved !== null ? saved === 'dark' : true; });

  useEffect(() => { if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('cristolandia_theme', 'dark'); } else { document.documentElement.classList.remove('dark'); localStorage.setItem('cristolandia_theme', 'light'); } }, [isDarkMode]);
  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const [currentUser, setCurrentUser] = useState<AppUserProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const handleLogout = async () => { const { logoutUser } = await import('./firebase'); await logoutUser(); setCurrentUser(null); };
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
  const [actionInitialDate, setActionInitialDate] = useState<string | null>(null);

  const handleSaveMissionaries = (updated: Missionary[]) => { setMissionaries(updated); saveMissionaries(updated); toast.success('Lista de missionários e turnos atualizada!'); };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) { setCurrentUser(null); return; }
        let profile = await getUserProfile(user.uid);
        if (!profile) profile = await createUserProfile(user, 'pendente');
        setCurrentUser(profile);
      } catch (err) { console.error('Erro ao carregar perfil:', err); setCurrentUser(null); }
      finally { setAuthResolved(true); }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'pendente') return;
    if (currentUser.role === 'admin') syncInitialFirestoreData().catch((err) => console.error('Bootstrap Firestore:', err));
    const unsubProds = subscribeToProducts((data) => { setProducts(data); saveProducts(data); });
    const unsubMovs = subscribeToMovements((data) => { setMovements(data); saveMovements(data); });
    const unsubKit = subscribeToDailyKit((data) => { setDailyKit(data); saveDailyKit(data); });
    const unsubMeals = subscribeToMeals((data) => { setMeals(data); saveMeals(data); });
    const unsubAudits = subscribeToInventoryAudits((data) => setInventoryAudits(data));
    const unsubSessions = subscribeToInventorySessions((data) => setInventorySessions(data));
    const unsubUsers = currentUser.role === 'admin' ? subscribeToUsers((users) => setAllUsers(users)) : () => undefined;
    return () => { unsubProds(); unsubMovs(); unsubKit(); unsubMeals(); unsubAudits(); unsubSessions(); unsubUsers(); };
  }, [currentUser?.uid, currentUser?.role]);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => { if (type === 'success') toast.success(message); else if (type === 'warning') toast.warning(message); else toast.info(message); };
  const handleSaveMealRecord = (record: Omit<DailyMealRecord, 'id' | 'totalMeals' | 'createdAt'> & { id?: string; createdAt?: string }) => { const { updatedMeals, savedRecord } = addOrUpdateMealRecord(meals, record); setMeals(updatedMeals); saveMealRecordToFirestore(savedRecord).catch((err) => showToast(err.message || 'Erro ao salvar refeição.', 'warning')); };
  const handleDeleteMealRecord = (id: string) => { setMeals(deleteStoredMealRecord(meals, id)); deleteMealRecordFromFirestore(id).catch((err) => showToast(err.message || 'Erro ao excluir refeição.', 'warning')); };
  const handleSelectLocalRole = (_role: UserRole) => showToast('A alteração de perfil é exclusiva do administrador.', 'warning');
  const handleResetData = () => showToast('A redefinição automática está desativada para proteger o histórico e o estoque real.', 'warning');
  const handleOpenEntryModal = (product?: Product | null, initialDate?: string | null) => { setSelectedProductForAction(product || null); setActionInitialDate(initialDate || null); setIsEntryModalOpen(true); };
  const handleOpenExitModal = (product?: Product | null, initialDate?: string | null) => { setSelectedProductForAction(product || null); setActionInitialDate(initialDate || null); setIsExitModalOpen(true); };
  const handleOpenTimeline = (product: Product) => setTimelineProduct(product);
  const handleOpenTimelineById = (productId: string) => { const p = products.find((prod) => prod.id === productId); if (p) setTimelineProduct(p); };

  const handleAddEntry = async (product: Product, quantity: number, entryType: EntryType, supplierOrDonor: string, receivedBy: string, date: string, time: string, notes: string) => {
    try {
      const result = await executeEntryTransaction(product.id, quantity, entryType, supplierOrDonor, receivedBy, date, time, notes);
      setProducts((prev) => prev.map((p) => p.id === result.updatedProduct.id ? result.updatedProduct : p));
      setMovements((prev) => [result.movement, ...prev.filter((m) => m.id !== result.movement.id)]);
      showToast(`+ ${quantity} ${product.unit} de ${product.name} registrada com sucesso!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar entrada', 'warning');
      throw err;
    }
  };

  const handleAddExit = async (product: Product, quantity: number, sector: Sector, retrievedBy: string, deliveredBy: string, date: string, time: string, notes: string) => {
    try {
      const result = await executeExitTransaction(product.id, quantity, sector, retrievedBy, deliveredBy, date, time, notes);
      setProducts((prev) => prev.map((p) => p.id === result.updatedProduct.id ? result.updatedProduct : p));
      setMovements((prev) => [result.movement, ...prev.filter((m) => m.id !== result.movement.id)]);
      showToast(`- ${quantity} ${product.unit} de ${product.name} entregue para ${sector}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar saída', 'warning');
      throw err;
    }
  };

  const handleAddBatchExit = async (items: Array<{ product: Product; quantity: number }>, sector: Sector, retrievedBy: string, deliveredBy: string, date: string, time: string, notes: string) => {
    try {
      const result = await executeBatchExitTransaction(items.map((item) => ({ productId: item.product.id, quantity: item.quantity })), sector, retrievedBy, deliveredBy, date, time, notes);
      setProducts((prev) => prev.map((p) => result.updatedProducts.find((u) => u.id === p.id) || p));
      setMovements((prev) => [...result.movements, ...prev.filter((m) => !result.movements.some((r) => r.id === m.id))]);
      const itemsSummary = items.map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(', ');
      showToast(`Saída de ${items.length} item(ns) realizada com sucesso para ${sector}! (${itemsSummary})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar saída de itens', 'warning');
      throw err;
    }
  };

  const handleUpdateMovement = async (movementId: string, updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }) => {
    try {
      const result = await updateStockMovementTransaction(movementId, updatedData);
      setProducts((prev) => prev.map((p) => result.updatedProducts.find((u) => u.id === p.id) || p));
      setMovements((prev) => prev.map((m) => m.id === result.movement.id ? result.movement : m));
      showToast('Movimentação atualizada com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar movimentação', 'warning');
      throw err;
    }
  };

  const handleDeleteMovement = async (movementId: string) => {
    try {
      const result = await deleteStockMovementTransaction(movementId);
      setProducts((prev) => prev.map((p) => p.id === result.updatedProduct.id ? result.updatedProduct : p));
      setMovements((prev) => prev.filter((m) => m.id !== result.deletedMovementId));
      showToast('Movimentação excluída e saldo de estoque estornado!', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir movimentação', 'warning');
      throw err;
    }
  };

  const handleDeliverKit = async (kitToDeliver: DailyKit, retrievedBy: string, deliveredBy: string, date: string, time: string, saveAsDefault?: boolean) => {
    try {
      if (saveAsDefault) {
        await saveDailyKitToFirestore(kitToDeliver);
        setDailyKit(kitToDeliver);
        saveDailyKit(kitToDeliver);
      }
      const result = await executeDailyKitTransaction(kitToDeliver, retrievedBy, deliveredBy, date, time);
      setProducts((prev) => prev.map((p) => result.updatedProducts.find((u) => u.id === p.id) || p));
      setMovements((prev) => [...result.movements, ...prev.filter((m) => !result.movements.some((r) => r.id === m.id))]);
      showToast(`⚡ Kit Diário da Cozinha baixado com sucesso! (${result.deliveredCount} itens atualizados)${saveAsDefault ? ' - Novo modelo padrão salvo!' : ''}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Não foi possível baixar o Kit Diário.', 'warning');
      throw err;
    }
  };
  const handleSaveProduct = async (updatedProd: Product) => { try { await saveProductToFirestore(updatedProd); setProducts((prev) => prev.map((p) => p.id === updatedProd.id ? updatedProd : p)); showToast(`Produto ${updatedProd.name} atualizado e sincronizado online!`, 'info'); } catch (err: any) { showToast(err.message || 'Erro ao salvar produto.', 'warning'); } };
  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'lastUpdated'>) => { const newProd: Product = { ...newProdData, id: `prod-${Date.now()}`, lastUpdated: new Date().toISOString() }; try { await saveProductToFirestore(newProd); setProducts((prev) => [newProd, ...prev]); showToast(`Novo produto ${newProd.name} cadastrado com sucesso!`, 'success'); } catch (err: any) { showToast(err.message || 'Erro ao cadastrar produto.', 'warning'); } };
  const handleForceSyncPhysicalInventory = () => showToast('A sincronização física automática está desativada para proteger o estoque real.', 'warning');

  if (!authResolved || !currentUser) return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  if (currentUser.role === 'pendente') return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white"><div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center shadow-2xl"><div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl">⏳</div><h1 className="text-xl font-black">Acesso aguardando aprovação</h1><p className="text-sm text-slate-400 mt-2">Olá, {currentUser.displayName}. Sua conta foi criada com segurança, mas ainda não recebeu uma permissão operacional.</p><p className="text-xs text-slate-500 mt-3">{currentUser.email}</p><button onClick={handleLogout} className="mt-6 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold text-xs">Sair</button></div></div>;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col md:flex-row selection:bg-indigo-600 selection:text-white transition-colors duration-200">
      <ToastContainer />
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
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <HeroAlertBanner products={products} dailyKit={dailyKit} userRole={currentUser.role} onOpenEntryModal={(p) => handleOpenEntryModal(p || null)} onOpenExitModal={(p) => handleOpenExitModal(p || null)} onOpenKitModal={() => setIsKitModalOpen(true)} onOpenReports={() => setActiveTab('reports')} onOpenMeals={() => setActiveTab('meals')} onOpenWhatsAppAlert={() => setIsWhatsAppModalOpen(true)} />
            
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

            <ReplenishmentAlertSection
              products={products}
              userRole={currentUser.role}
              onOpenEntry={(p) => handleOpenEntryModal(p)}
              onViewAllProducts={() => setActiveTab('products')}
            />

            <RecentMovementsSection
              movements={movements}
              products={products}
              userRole={currentUser.role}
              onViewAllMovements={() => setActiveTab('entries')}
              onOpenProductTimeline={handleOpenTimelineById}
            />

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

            <DashboardCharts products={products} movements={movements} />
          </motion.div>}
          {activeTab === 'products' && <ProductManager products={products} onOpenTimeline={handleOpenTimeline} onOpenEntry={handleOpenEntryModal} onOpenExit={handleOpenExitModal} onSaveProduct={handleSaveProduct} onAddProduct={handleAddProduct} userRole={currentUser.role} onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)} />}
          {activeTab === 'entries' && <div className="space-y-6"><div className="flex items-center justify-between bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><div><h2 className="text-lg font-bold text-slate-900">Entradas no Estoque (Compras e Doações)</h2><p className="text-xs text-slate-500">Rastreio de todos os mantimentos recebidos na Cristolândia</p></div>{currentUser.role === 'admin' && <button onClick={() => handleOpenEntryModal(null)} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer">+ Nova Entrada</button>}</div><MovementsHistory movements={movements.filter((m) => m.type === 'entrada')} products={products} userRole={currentUser.role} onOpenProductTimeline={handleOpenTimelineById} onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)} onOpenExitForDate={(d) => handleOpenExitModal(null, d)} onUpdateMovement={handleUpdateMovement} onDeleteMovement={handleDeleteMovement} /></div>}
          {activeTab === 'exits' && <div className="space-y-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><div><h2 className="text-lg font-bold text-slate-900">Saídas do Estoque por Setor</h2><p className="text-xs text-slate-500">Entrega de mantimentos para a Cozinha, Casa Masculina, Casa Feminina e Eventos</p></div><div className="flex items-center gap-2"><button onClick={() => setIsKitModalOpen(true)} className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer flex items-center gap-2"><Utensils className="w-4 h-4" /><span>{currentUser.role === 'admin' ? '+ Kit Cozinha Diário' : 'Visualizar Kit Cozinha'}</span></button>{currentUser.role === 'admin' && <button onClick={() => handleOpenExitModal(null)} className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer">Nova Saída</button>}</div></div><MovementsHistory movements={movements.filter((m) => m.type === 'saida')} products={products} userRole={currentUser.role} onOpenProductTimeline={handleOpenTimelineById} onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)} onOpenExitForDate={(d) => handleOpenExitModal(null, d)} onUpdateMovement={handleUpdateMovement} onDeleteMovement={handleDeleteMovement} /></div>}
          {activeTab === 'meals' && <MealManager meals={meals} missionaries={missionaries} userRole={currentUser.role} currentUserDisplayName={currentUser.displayName || 'Marconi Castro (Gestor do Estoque)'} onSaveMealRecord={handleSaveMealRecord} onDeleteMealRecord={handleDeleteMealRecord} />}
          {activeTab === 'reports' && <ReportsView products={products} movements={movements} />}
        </AnimatePresence>
      </main>
      {timelineProduct && <ProductTimelineModal product={timelineProduct} movements={movements} onClose={() => setTimelineProduct(null)} onOpenEntry={(p) => handleOpenEntryModal(p)} onOpenExit={(p) => handleOpenExitModal(p)} />}
      {isEntryModalOpen && <EntryModal products={products} selectedProduct={selectedProductForAction} initialDate={actionInitialDate || undefined} onClose={() => { setIsEntryModalOpen(false); setSelectedProductForAction(null); setActionInitialDate(null); }} onSubmit={handleAddEntry} />}
      {isExitModalOpen && <ExitModal products={products} selectedProduct={selectedProductForAction} initialDate={actionInitialDate || undefined} missionaries={missionaries} onClose={() => { setIsExitModalOpen(false); setSelectedProductForAction(null); setActionInitialDate(null); }} onSubmitBatch={handleAddBatchExit} onSubmit={handleAddExit} />}
      {isKitModalOpen && <DailyKitModal products={products} kit={dailyKit} missionaries={missionaries} userRole={currentUser.role} onClose={() => setIsKitModalOpen(false)} onSubmitKit={handleDeliverKit} />}
      <MissionaryManagerModal isOpen={isMissionariesModalOpen} onClose={() => setIsMissionariesModalOpen(false)} missionaries={missionaries} onSaveMissionaries={handleSaveMissionaries} />
      <WhatsAppAlertModal isOpen={isWhatsAppModalOpen} onClose={() => setIsWhatsAppModalOpen(false)} products={products} />
      {isPhysicalInventoryOpen && (
        <PhysicalInventoryModal
          isOpen={isPhysicalInventoryOpen}
          products={products}
          userRole={currentUser.role}
          currentUserName={currentUser.displayName || 'Marconi Castro'}
          currentUserEmail={currentUser.email}
          currentUserUid={currentUser.uid}
          inventoryAudits={inventoryAudits}
          inventorySessions={inventorySessions}
          onClose={() => setIsPhysicalInventoryOpen(false)}
          onNotify={(msg, type) => {
            if (type === 'error') showToast(msg, 'warning');
            else if (type === 'warning') showToast(msg, 'warning');
            else if (type === 'info') showToast(msg, 'info');
            else showToast(msg, 'success');
          }}
        />
      )}
      {isReconciliationPreviewOpen && (
        <PhysicalReconciliationPreviewModal
          isOpen={isReconciliationPreviewOpen}
          products={products}
          userRole={currentUser.role}
          currentUserName={currentUser.displayName || 'Marconi Castro'}
          currentUserEmail={currentUser.email}
          currentUserUid={currentUser.uid}
          onClose={() => setIsReconciliationPreviewOpen(false)}
          onNotify={(msg, type) => {
            if (type === 'error') showToast(msg, 'warning');
            else if (type === 'warning') showToast(msg, 'warning');
            else if (type === 'info') showToast(msg, 'info');
            else showToast(msg, 'success');
          }}
        />
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} currentUser={currentUser} allUsers={allUsers} onSelectRole={handleSelectLocalRole} onRefreshProfile={async () => { if (auth.currentUser) { const p = await getUserProfile(auth.currentUser.uid); if (p) setCurrentUser(p); } }} />
    </div>
  );
}
