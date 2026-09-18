import React, { useCallback } from 'react';
import { Product } from './types';
import { auth, getUserProfile, UserRole } from './firebase';
import { useAuthSession } from './hooks/useAuthSession';
import { useInventoryData } from './hooks/useInventoryData';
import { useAppModals } from './hooks/useAppModals';
import { useAppNavigation } from './hooks/useAppNavigation';
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
import { AiAssistantView } from './components/AiAssistantView';
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
  // 1. Sessão e Autenticação
  const {
    currentUser,
    setCurrentUser,
    authResolved,
    allUsers,
    handleLogout,
    handleLoginSuccess,
  } = useAuthSession();

  // 2. Navegação e Tema
  const {
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleDarkMode,
  } = useAppNavigation();

  // 3. Dados e Transações de Inventário
  const {
    products,
    movements,
    dailyKit,
    missionaries,
    meals,
    inventoryAudits,
    inventorySessions,
    handleAddEntry,
    handleAddExit,
    handleAddBatchExit,
    handleUpdateMovement,
    handleDeleteMovement,
    handleDeliverKit,
    handleSaveProduct,
    handleAddProduct,
    handleSaveMealRecord,
    handleDeleteMealRecord,
    handleSaveMissionaries,
  } = useInventoryData(currentUser);

  // 4. Controle de Modais e Seleções
  const {
    isEntryModalOpen,
    setIsEntryModalOpen,
    isExitModalOpen,
    setIsExitModalOpen,
    isKitModalOpen,
    setIsKitModalOpen,
    isMissionariesModalOpen,
    setIsMissionariesModalOpen,
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    isPhysicalInventoryOpen,
    setIsPhysicalInventoryOpen,
    isReconciliationPreviewOpen,
    setIsReconciliationPreviewOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    timelineProduct,
    setTimelineProduct,
    selectedProductForAction,
    setSelectedProductForAction,
    actionInitialDate,
    setActionInitialDate,
    handleOpenEntryModal,
    handleOpenExitModal,
    handleOpenTimeline,
    handleOpenTimelineById,
  } = useAppModals();

  const handleSelectLocalRole = useCallback((_role: UserRole) => {
    toast.warning('A alteração de perfil é exclusiva do administrador.');
  }, []);

  const handleResetData = useCallback(() => {
    toast.warning('A redefinição automática está desativada para proteger o histórico e o estoque real.');
  }, []);

  const handleForceSyncPhysicalInventory = useCallback(() => {
    toast.warning('A sincronização física automática está desativada para proteger o estoque real.');
  }, []);

  // Telas de guarda (autenticação e pendente)
  if (!authResolved || !currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.role === 'pendente') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center shadow-2xl">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl">
            ⏳
          </div>
          <h1 className="text-xl font-black">Acesso aguardando aprovação</h1>
          <p className="text-sm text-slate-400 mt-2">
            Olá, {currentUser.displayName}. Sua conta foi criada com segurança, mas ainda não recebeu uma permissão operacional.
          </p>
          <p className="text-xs text-slate-500 mt-3">{currentUser.email}</p>
          <button
            onClick={handleLogout}
            className="mt-6 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold text-xs cursor-pointer hover:bg-slate-100 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

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
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <HeroAlertBanner
                products={products}
                dailyKit={dailyKit}
                userRole={currentUser.role}
                onOpenEntryModal={(p) => handleOpenEntryModal(p || null)}
                onOpenExitModal={(p) => handleOpenExitModal(p || null)}
                onOpenKitModal={() => setIsKitModalOpen(true)}
                onOpenReports={() => setActiveTab('reports')}
                onOpenMeals={() => setActiveTab('meals')}
                onOpenWhatsAppAlert={() => setIsWhatsAppModalOpen(true)}
              />

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
                onOpenProductTimeline={(id) => handleOpenTimelineById(id, products)}
              />

              <CurrentStockOverview
                products={products}
                movements={movements}
                inventoryAudits={inventoryAudits}
                userRole={currentUser.role}
                userEmail={currentUser.email}
                onOpenEntry={(p) => handleOpenEntryModal(p)}
                onOpenExit={(p) => handleOpenExitModal(p)}
                onOpenTimeline={(id) => handleOpenTimelineById(id, products)}
                onOpenPhysicalInventory={() => setIsPhysicalInventoryOpen(true)}
                onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)}
                onForceSyncPhysicalStock={handleForceSyncPhysicalInventory}
              />

              <DashboardCharts products={products} movements={movements} />
            </motion.div>
          )}

          {activeTab === 'ai_assistant' && (
            <motion.div key="ai_assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AiAssistantView
                products={products}
                movements={movements}
                meals={meals}
                dailyKit={dailyKit}
                missionaries={missionaries}
                inventoryAudits={inventoryAudits}
                inventorySessions={inventorySessions}
                currentUser={currentUser}
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
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Entradas no Estoque (Compras e Doações)</h2>
                  <p className="text-xs text-slate-500">Rastreio de todos os mantimentos recebidos na Cristolândia</p>
                </div>
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => handleOpenEntryModal(null)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer"
                  >
                    + Nova Entrada
                  </button>
                )}
              </div>
              <MovementsHistory
                movements={movements.filter((m) => m.type === 'entrada')}
                products={products}
                userRole={currentUser.role}
                onOpenProductTimeline={(id) => handleOpenTimelineById(id, products)}
                onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)}
                onOpenExitForDate={(d) => handleOpenExitModal(null, d)}
                onUpdateMovement={handleUpdateMovement}
                onDeleteMovement={handleDeleteMovement}
              />
            </div>
          )}

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
                    <span>{currentUser.role === 'admin' ? '+ Kit Cozinha Diário' : 'Visualizar Kit Cozinha'}</span>
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => handleOpenExitModal(null)}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer"
                    >
                      Nova Saída
                    </button>
                  )}
                </div>
              </div>
              <MovementsHistory
                movements={movements.filter((m) => m.type === 'saida')}
                products={products}
                userRole={currentUser.role}
                onOpenProductTimeline={(id) => handleOpenTimelineById(id, products)}
                onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)}
                onOpenExitForDate={(d) => handleOpenExitModal(null, d)}
                onUpdateMovement={handleUpdateMovement}
                onDeleteMovement={handleDeleteMovement}
              />
            </div>
          )}

          {activeTab === 'meals' && (
            <MealManager
              meals={meals}
              missionaries={missionaries}
              userRole={currentUser.role}
              currentUserDisplayName={currentUser.displayName || 'Marconi Castro (Gestor do Estoque)'}
              currentUserEmail={currentUser.email}
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
                userEmail={currentUser.email}
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-4">
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
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  Voltar ao Painel de Consulta
                </button>
              </div>
            )
          )}
        </AnimatePresence>
      </main>

      {timelineProduct && (
        <ProductTimelineModal
          product={timelineProduct}
          movements={movements}
          userRole={currentUser.role}
          onClose={() => setTimelineProduct(null)}
          onOpenEntry={(p) => handleOpenEntryModal(p)}
          onOpenExit={(p) => handleOpenExitModal(p)}
        />
      )}

      {isEntryModalOpen && currentUser.role === 'admin' && (
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

      {isExitModalOpen && currentUser.role === 'admin' && (
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

      {isKitModalOpen && (
        <DailyKitModal
          products={products}
          kit={dailyKit}
          missionaries={missionaries}
          userRole={currentUser.role}
          onClose={() => setIsKitModalOpen(false)}
          onSubmitKit={handleDeliverKit}
        />
      )}

      {isMissionariesModalOpen && currentUser.role === 'admin' && (
        <MissionaryManagerModal
          isOpen={isMissionariesModalOpen}
          onClose={() => setIsMissionariesModalOpen(false)}
          missionaries={missionaries}
          onSaveMissionaries={handleSaveMissionaries}
        />
      )}

      {isWhatsAppModalOpen && currentUser.role === 'admin' && (
        <WhatsAppAlertModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          products={products}
        />
      )}

      {isPhysicalInventoryOpen && currentUser.role === 'admin' && (
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
            if (type === 'error' || type === 'warning') toast.warning(msg);
            else if (type === 'info') toast.info(msg);
            else toast.success(msg);
          }}
        />
      )}

      {isReconciliationPreviewOpen && currentUser.role === 'admin' && (
        <PhysicalReconciliationPreviewModal
          isOpen={isReconciliationPreviewOpen}
          products={products}
          userRole={currentUser.role}
          currentUserName={currentUser.displayName || 'Marconi Castro'}
          currentUserEmail={currentUser.email}
          currentUserUid={currentUser.uid}
          onClose={() => setIsReconciliationPreviewOpen(false)}
          onNotify={(msg, type) => {
            if (type === 'error' || type === 'warning') toast.warning(msg);
            else if (type === 'info') toast.info(msg);
            else toast.success(msg);
          }}
        />
      )}

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
