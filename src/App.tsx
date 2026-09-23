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
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { PvpsRunwayBanner } from './components/PvpsRunwayBanner';
import { CommandPalette } from './components/CommandPalette';
import { QuickGuideModal } from './components/QuickGuideModal';
import { usePwaInstall } from './hooks/usePwaInstall';
import { exportFullSystemJSON, exportExcelCompatibleCSV } from './utils/backupExport';
import { LoginScreen } from './components/LoginScreen';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './utils/toast';
import { DEFAULT_DML_KIT } from './data/initialDmlData';
import { filterProductsByDepartment, filterMovementsByDepartment } from './utils/departmentUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Sparkles } from 'lucide-react';

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
    activeDepartment,
    setActiveDepartment,
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

  // Isolamento seguro, profissional e estrito por Departamento (Alimentação vs DML & Limpeza)
  const departmentProducts = React.useMemo(() => {
    return filterProductsByDepartment(products, activeDepartment);
  }, [products, activeDepartment]);

  const departmentMovements = React.useMemo(() => {
    return filterMovementsByDepartment(movements, departmentProducts, activeDepartment);
  }, [movements, departmentProducts, activeDepartment]);

  const activeKit = React.useMemo(() => {
    if (activeDepartment === 'dml') {
      return DEFAULT_DML_KIT;
    }
    return dailyKit;
  }, [activeDepartment, dailyKit]);

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

  // 5. Agilidade e Inteligência (Pilares 2, 3 e 4)
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = React.useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = React.useState(false);
  const { canInstall, triggerInstall } = usePwaInstall();

  // Atalho Global Spotlight: Ctrl + K ou Cmd + K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeDetected = useCallback((code: string) => {
    const cleanCode = code.trim().toLowerCase();
    const matched = departmentProducts.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
        p.id.toLowerCase() === cleanCode ||
        p.name.toLowerCase().includes(cleanCode)
    );

    if (matched) {
      toast.success(`Item identificado: ${matched.name}!`);
      setSelectedProductForAction(matched);
      setIsBarcodeScannerOpen(false);
      setIsExitModalOpen(true);
    } else {
      toast.info(`Código lido: ${code}. Abrindo registro de entrada.`);
      setIsBarcodeScannerOpen(false);
      setIsEntryModalOpen(true);
    }
  }, [departmentProducts, setSelectedProductForAction, setIsBarcodeScannerOpen, setIsExitModalOpen, setIsEntryModalOpen]);

  const handleImportReceiptEntries = useCallback(async (entries: any[]) => {
    let count = 0;
    for (const entry of entries) {
      try {
        await handleAddEntry({
          productId: entry.productId,
          productName: entry.productName,
          quantity: entry.quantity,
          unit: entry.unit,
          unitPrice: entry.unitPrice,
          date: entry.date,
          supplierOrDonor: entry.supplier,
          notes: entry.notes,
          category: entry.category,
        });
        count++;
      } catch (err) {
        console.error('Erro ao importar entrada:', err);
      }
    }
    toast.success(`${count} itens da nota fiscal importados com sucesso!`);
  }, [handleAddEntry]);

  const handleBackupData = useCallback(() => {
    exportFullSystemJSON({
      products,
      movements,
      meals,
      missionaries,
      userName: currentUser?.displayName,
      userEmail: currentUser?.email,
    });
    exportExcelCompatibleCSV({
      products,
      movements,
      meals,
    });
    toast.success('Backup exportado com sucesso (JSON + Planilha Excel)!');
  }, [products, movements, meals, missionaries, currentUser]);

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
    <div
      id="app-root"
      data-theme={isDarkMode ? 'dark' : 'light'}
      className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-slate-100 dark:bg-[#070913] text-slate-900 dark:text-slate-100 font-sans flex flex-col md:flex-row selection:bg-indigo-600 selection:text-white transition-colors duration-200 relative md:h-screen md:overflow-hidden`}
    >
      {/* Ambient background glow for high-end SaaS feel */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-30 dark:opacity-100 transition-opacity">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-gradient-to-r from-emerald-600/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-gradient-to-l from-amber-600/5 to-transparent blur-[130px] rounded-full" />
      </div>

      <ToastContainer />
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDepartment={activeDepartment}
        onSelectDepartment={setActiveDepartment}
        onOpenKitModal={() => setIsKitModalOpen(true)}
        onOpenPhysicalInventory={() => setIsPhysicalInventoryOpen(true)}
        onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)}
        onOpenMissionariesModal={() => setIsMissionariesModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
        onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        onBackupData={handleBackupData}
        canInstallPwa={canInstall}
        onInstallPwa={triggerInstall}
        onResetData={handleResetData}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenQuickGuide={() => setIsQuickGuideOpen(true)}
      />
      <main className="flex-1 md:h-screen md:overflow-y-auto overflow-x-hidden relative z-10 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <HeroAlertBanner
                products={departmentProducts}
                dailyKit={activeKit}
                userRole={currentUser.role}
                activeDepartment={activeDepartment}
                onOpenEntryModal={(p) => handleOpenEntryModal(p || null)}
                onOpenExitModal={(p) => handleOpenExitModal(p || null)}
                onOpenKitModal={() => setIsKitModalOpen(true)}
                onOpenReports={() => setActiveTab('reports')}
                onOpenMeals={() => setActiveTab('meals')}
                onOpenWhatsAppAlert={() => setIsWhatsAppModalOpen(true)}
              />

              {/* Autonomia Alimentar e Regra PVPS (Pilar 2) */}
              <PvpsRunwayBanner
                products={departmentProducts}
                movements={departmentMovements}
                onOpenExitForProduct={(p) => handleOpenExitModal(p)}
              />

              <KpiCards
                products={departmentProducts}
                movements={departmentMovements}
                dailyKit={activeKit}
                meals={meals}
                userRole={currentUser.role}
                activeDepartment={activeDepartment}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenEntryModal={() => handleOpenEntryModal(null)}
                onOpenExitModal={() => handleOpenExitModal(null)}
                onOpenKitModal={() => setIsKitModalOpen(true)}
                onOpenMealsModal={() => setActiveTab('meals')}
              />

              <ReplenishmentAlertSection
                products={departmentProducts}
                userRole={currentUser.role}
                onOpenEntry={(p) => handleOpenEntryModal(p)}
                onViewAllProducts={() => setActiveTab('products')}
              />

              <RecentMovementsSection
                movements={departmentMovements}
                products={departmentProducts}
                userRole={currentUser.role}
                onViewAllMovements={() => setActiveTab('entries')}
                onOpenProductTimeline={(id) => handleOpenTimelineById(id, departmentProducts)}
              />

              <CurrentStockOverview
                products={departmentProducts}
                movements={departmentMovements}
                inventoryAudits={inventoryAudits}
                userRole={currentUser.role}
                userEmail={currentUser.email}
                onOpenEntry={(p) => handleOpenEntryModal(p)}
                onOpenExit={(p) => handleOpenExitModal(p)}
                onOpenTimeline={(id) => handleOpenTimelineById(id, departmentProducts)}
                onOpenPhysicalInventory={() => setIsPhysicalInventoryOpen(true)}
                onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)}
                onForceSyncPhysicalStock={handleForceSyncPhysicalInventory}
              />

              <DashboardCharts products={departmentProducts} movements={departmentMovements} />
            </motion.div>
          )}

          {activeTab === 'ai_assistant' && (
            <motion.div key="ai_assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AiAssistantView
                products={departmentProducts}
                movements={departmentMovements}
                meals={meals}
                dailyKit={activeKit}
                missionaries={missionaries}
                inventoryAudits={inventoryAudits}
                inventorySessions={inventorySessions}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {activeTab === 'products' && (
            <ProductManager
              products={departmentProducts}
              onOpenTimeline={handleOpenTimeline}
              onOpenEntry={handleOpenEntryModal}
              onOpenExit={handleOpenExitModal}
              onSaveProduct={handleSaveProduct}
              onAddProduct={(p) => handleAddProduct({ ...p, department: activeDepartment })}
              userRole={currentUser.role}
              onOpenReconciliationPreview={() => setIsReconciliationPreviewOpen(true)}
              activeDepartment={activeDepartment}
            />
          )}

          {activeTab === 'entries' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeDepartment === 'dml'
                      ? 'Entradas no DML (Compras e Doações de Limpeza & Higiene)'
                      : 'Entradas no Estoque (Compras e Doações de Alimentos)'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeDepartment === 'dml'
                      ? 'Rastreio de produtos químicos, descartáveis e itens de higiene recebidos'
                      : 'Rastreio de todos os mantimentos alimentícios recebidos na Cristolândia'}
                  </p>
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
                movements={departmentMovements.filter((m) => m.type === 'entrada')}
                products={departmentProducts}
                userRole={currentUser.role}
                onOpenProductTimeline={(id) => handleOpenTimelineById(id, departmentProducts)}
                onOpenEntryForDate={(d) => handleOpenEntryModal(null, d)}
                onOpenExitForDate={(d) => handleOpenExitModal(null, d)}
                onUpdateMovement={handleUpdateMovement}
                onDeleteMovement={handleDeleteMovement}
              />
            </div>
          )}

          {activeTab === 'exits' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeDepartment === 'dml'
                      ? 'Saídas do DML por Destino (Limpeza & Kits)'
                      : 'Saídas do Estoque por Setor (Cozinha & Casas)'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeDepartment === 'dml'
                      ? 'Distribuição para Dormitórios, Banheiros, Lavanderia, Cozinha e Kits Acolhidos'
                      : 'Entrega de mantimentos para a Cozinha, Casa Masculina, Casa Feminina e Eventos'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsKitModalOpen(true)}
                    className={`px-5 py-3 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer flex items-center gap-2 ${
                      activeDepartment === 'dml'
                        ? 'bg-cyan-600 hover:bg-cyan-500'
                        : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {activeDepartment === 'dml' ? <Sparkles className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                    <span>
                      {currentUser.role === 'admin'
                        ? activeDepartment === 'dml' ? '+ Kit Higiene Acolhidos' : '+ Kit Cozinha Diário'
                        : activeDepartment === 'dml' ? 'Visualizar Kit Higiene' : 'Visualizar Kit Cozinha'}
                    </span>
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => handleOpenExitModal(null)}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm cursor-pointer"
                    >
                      Nova Saída
                    </button>
                  )}
                </div>
              </div>
              <MovementsHistory
                movements={departmentMovements.filter((m) => m.type === 'saida')}
                products={departmentProducts}
                userRole={currentUser.role}
                onOpenProductTimeline={(id) => handleOpenTimelineById(id, departmentProducts)}
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
                products={departmentProducts}
                movements={departmentMovements}
                meals={meals}
                missionaries={missionaries}
                inventoryAudits={inventoryAudits}
                userRole={currentUser.role}
                userName={currentUser.displayName || 'Marconi Castro (Gestor do Estoque)'}
                userEmail={currentUser.email}
                activeDepartment={activeDepartment}
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
        </div>
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
          products={departmentProducts}
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
          products={departmentProducts}
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
          products={departmentProducts}
          kit={activeKit}
          missionaries={missionaries}
          userRole={currentUser.role}
          activeDepartment={activeDepartment}
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
          products={departmentProducts}
          meals={meals}
          movements={departmentMovements}
        />
      )}

      {isQuickGuideOpen && (
        <QuickGuideModal
          isOpen={isQuickGuideOpen}
          onClose={() => setIsQuickGuideOpen(false)}
          onOpenKitModal={() => setIsKitModalOpen(true)}
          onOpenReports={() => setActiveTab('reports')}
        />
      )}

      {isPhysicalInventoryOpen && currentUser.role === 'admin' && (
        <PhysicalInventoryModal
          isOpen={isPhysicalInventoryOpen}
          products={departmentProducts}
          department={activeDepartment}
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
          products={departmentProducts}
          department={activeDepartment}
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

      {isBarcodeScannerOpen && (
        <BarcodeScannerModal
          products={departmentProducts}
          onClose={() => setIsBarcodeScannerOpen(false)}
          onScanProduct={handleBarcodeDetected}
          onOpenEntry={(p) => handleOpenEntryModal(p)}
          onOpenExit={(p) => handleOpenExitModal(p)}
        />
      )}

      {isReceiptScannerOpen && (
        <ReceiptScannerModal
          products={departmentProducts}
          onClose={() => setIsReceiptScannerOpen(false)}
          onImportEntries={handleImportReceiptEntries}
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

      {/* Global Spotlight / Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        products={departmentProducts}
        activeDepartment={activeDepartment}
        onSelectDepartment={setActiveDepartment}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
        onOpenEntryModal={() => {
          handleOpenEntryModal(null);
        }}
        onOpenExitModal={(product) => {
          handleOpenExitModal(product || null);
        }}
        onOpenBarcodeScanner={() => setIsBarcodeScannerOpen(true)}
        onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        onOpenJmnPdf={() => setActiveTab('reports')}
        onOpenDonationReceipt={() => setActiveTab('reports')}
        onOpenKitModal={() => {
          setIsKitModalOpen(true);
        }}
        onBackupData={handleBackupData}
        onOpenQuickGuide={() => setIsQuickGuideOpen(true)}
      />
    </div>
  );
}
