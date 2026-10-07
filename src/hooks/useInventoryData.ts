import { useState, useEffect, useCallback } from 'react';
import {
  Product,
  StockMovement,
  DailyKit,
  EntryType,
  Sector,
  Missionary,
  DailyMealRecord,
  InventoryAudit,
  InventorySessionSummary,
} from '../types';
import {
  getStoredProducts,
  saveProducts,
  getStoredMovements,
  saveMovements,
  getStoredDailyKit,
  saveDailyKit,
  getStoredMissionaries,
  saveMissionaries,
  getStoredMeals,
  saveMeals,
  addOrUpdateMealRecord,
  deleteStoredMealRecord,
} from '../utils/storage';
import {
  subscribeToProducts,
  subscribeToMovements,
  subscribeToDailyKit,
  subscribeToMeals,
  subscribeToInventoryAudits,
  subscribeToInventorySessions,
  saveProductToFirestore,
  saveDailyKitToFirestore,
  saveMealRecordToFirestore,
  deleteMealRecordFromFirestore,
  subscribeToMissionaries,
  saveMissionariesToFirestore,
  syncInitialFirestoreData,
  executeEntryTransaction,
  executeExitTransaction,
  executeBatchExitTransaction,
  executeDailyKitTransaction,
  updateStockMovementTransaction,
  deleteStockMovementTransaction,
  isMarcoZeroRecord,
} from '../services/firestoreService';
import { toast } from '../utils/toast';
import { AppUserProfile } from '../firebase';

export function useInventoryData(currentUser: AppUserProfile | null) {
  const [products, setProducts] = useState<Product[]>(getStoredProducts());
  const [movements, setMovements] = useState<StockMovement[]>(getStoredMovements());
  const [dailyKit, setDailyKit] = useState<DailyKit>(getStoredDailyKit());
  const [missionaries, setMissionaries] = useState<Missionary[]>(getStoredMissionaries());
  const [meals, setMeals] = useState<DailyMealRecord[]>(getStoredMeals());
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAudit[]>([]);
  const [inventorySessions, setInventorySessions] = useState<InventorySessionSummary[]>([]);
  const [dataReady, setDataReady] = useState(false);

  // Sincronização e subscrições reativas do Firestore com garantias de carregamento (Lote 6)
  useEffect(() => {
    // Caso 4: Usuário deslogado ou pendente — não espera dados, login/bloqueio prevalece
    if (!currentUser || currentUser.role === 'pendente') {
      setDataReady(false);
      return;
    }

    // Caso 3: Sem internet — se o navegador estiver offline, libera imediatamente para exibir cache local
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setDataReady(true);
      return;
    }

    const handleOffline = () => {
      setDataReady(true);
    };
    window.addEventListener('offline', handleOffline);

    // Caso 1: Prazo máximo de 8 segundos — nunca travar
    const emergencyTimeout = setTimeout(() => {
      setDataReady(true);
    }, 8000);

    // Caso 2: Erro de conexão em qualquer assinatura — libera imediatamente
    const handleSubError = (err: unknown) => {
      console.warn('Erro de assinatura do Firestore (liberando tela de carregamento):', err);
      setDataReady(true);
    };

    let prodsReceived = false;
    let movsReceived = false;

    const checkAndSetReady = () => {
      // Quando as duas coleções principais responderem (mesmo vazias), dados estão prontos
      if (prodsReceived && movsReceived) {
        setDataReady(true);
      }
    };

    // Tolerância de transição suave: se uma das duas responder e a outra tardar mais de 3s, libera também
    const graceTimeout = setTimeout(() => {
      if (prodsReceived || movsReceived) {
        setDataReady(true);
      }
    }, 3000);

    if (currentUser.role === 'admin') {
      syncInitialFirestoreData().catch((err) => console.error('Bootstrap Firestore:', err));
    }

    const unsubProds = subscribeToProducts(
      (data) => {
        setProducts(data);
        saveProducts(data);
        prodsReceived = true;
        checkAndSetReady();
      },
      handleSubError
    );

    const unsubMovs = subscribeToMovements(
      (data) => {
        setMovements(data);
        saveMovements(data);
        movsReceived = true;
        checkAndSetReady();
      },
      handleSubError
    );

    const unsubKit = subscribeToDailyKit(
      (data) => {
        setDailyKit(data);
        saveDailyKit(data);
      },
      handleSubError
    );

    const unsubMeals = subscribeToMeals(
      (data) => {
        setMeals(data);
        saveMeals(data);
      },
      handleSubError
    );

    const unsubAudits = subscribeToInventoryAudits(
      (data) => setInventoryAudits(data),
      handleSubError
    );

    const unsubSessions = subscribeToInventorySessions(
      (data) => setInventorySessions(data),
      handleSubError
    );

    const unsubMissionaries = subscribeToMissionaries(
      (data) => {
        if (data && data.length > 0) {
          setMissionaries(data);
          saveMissionaries(data);
        }
      },
      handleSubError
    );

    return () => {
      clearTimeout(emergencyTimeout);
      clearTimeout(graceTimeout);
      window.removeEventListener('offline', handleOffline);
      unsubProds();
      unsubMovs();
      unsubKit();
      unsubMeals();
      unsubAudits();
      unsubSessions();
      unsubMissionaries();
    };
  }, [currentUser?.uid, currentUser?.role]);

  const handleSaveMissionaries = useCallback((updated: Missionary[]) => {
    if (currentUser?.role !== 'admin') {
      toast.warning('Apenas o Administrador pode alterar a escala de missionários.');
      return;
    }
    setMissionaries(updated);
    saveMissionaries(updated);
    saveMissionariesToFirestore(updated).then(() => {
      toast.success('Lista de missionários sincronizada com o Firestore!');
    }).catch((err) => {
      console.error('Erro ao salvar missionários no Firestore:', err);
      toast.warning('Salvo localmente. Erro ao sincronizar na nuvem.');
    });
  }, [currentUser?.role]);

  const handleSaveMealRecord = useCallback(
    (record: Omit<DailyMealRecord, 'id' | 'totalMeals' | 'createdAt'> & { id?: string; createdAt?: string }) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador pode registrar refeições.');
        return;
      }
      const { updatedMeals, savedRecord } = addOrUpdateMealRecord(meals, record);
      setMeals(updatedMeals);
      saveMealRecordToFirestore(savedRecord).catch((err) =>
        toast.warning(err.message || 'Erro ao salvar refeição.')
      );
    },
    [currentUser?.role, meals]
  );

  const handleDeleteMealRecord = useCallback(
    (id: string) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador pode excluir registros de refeições.');
        return;
      }
      setMeals(deleteStoredMealRecord(meals, id));
      deleteMealRecordFromFirestore(id).catch((err) =>
        toast.warning(err.message || 'Erro ao excluir refeição.')
      );
    },
    [currentUser?.role, meals]
  );

  const handleAddEntry = useCallback(
    async (
      product: Product,
      quantity: number,
      entryType: EntryType,
      supplierOrDonor: string,
      receivedBy: string,
      date: string,
      time: string,
      notes: string,
      clientRequestId?: string
    ) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode registrar entradas.');
        return;
      }
      try {
        const result = await executeEntryTransaction(
          product.id,
          quantity,
          entryType,
          supplierOrDonor,
          receivedBy,
          date,
          time,
          notes,
          clientRequestId
        );
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === result.updatedProduct.id ? result.updatedProduct : p));
          saveProducts(next);
          return next;
        });
        setMovements((prev) => {
          const next = [result.movement, ...prev.filter((m) => m.id !== result.movement.id)];
          saveMovements(next);
          return next;
        });
        toast.success(`+ ${quantity} ${product.unit} de ${product.name} registrada com sucesso!`);
      } catch (err: any) {
        toast.warning(err.message || 'Erro ao registrar entrada');
        throw err;
      }
    },
    [currentUser?.role]
  );

  const handleAddExit = useCallback(
    async (
      product: Product,
      quantity: number,
      sector: Sector,
      retrievedBy: string,
      deliveredBy: string,
      date: string,
      time: string,
      notes: string,
      clientRequestId?: string
    ) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode registrar saídas.');
        return;
      }
      try {
        const result = await executeExitTransaction(
          product.id,
          quantity,
          sector,
          retrievedBy,
          deliveredBy,
          date,
          time,
          notes,
          clientRequestId
        );
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === result.updatedProduct.id ? result.updatedProduct : p));
          saveProducts(next);
          return next;
        });
        setMovements((prev) => {
          const next = [result.movement, ...prev.filter((m) => m.id !== result.movement.id)];
          saveMovements(next);
          return next;
        });
        toast.success(`- ${quantity} ${product.unit} de ${product.name} entregue para ${sector}!`);
      } catch (err: any) {
        toast.warning(err.message || 'Erro ao registrar saída');
        throw err;
      }
    },
    [currentUser?.role]
  );

  const handleAddBatchExit = useCallback(
    async (
      items: Array<{ product: Product; quantity: number }>,
      sector: Sector,
      retrievedBy: string,
      deliveredBy: string,
      date: string,
      time: string,
      notes: string,
      clientRequestId?: string
    ) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode registrar saídas.');
        return;
      }
      try {
        const result = await executeBatchExitTransaction(
          items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          sector,
          retrievedBy,
          deliveredBy,
          date,
          time,
          notes,
          clientRequestId
        );
        setProducts((prev) => {
          const next = prev.map((p) => result.updatedProducts.find((u) => u.id === p.id) || p);
          saveProducts(next);
          return next;
        });
        setMovements((prev) => {
          const next = [
            ...result.movements,
            ...prev.filter((m) => !result.movements.some((r) => r.id === m.id)),
          ];
          saveMovements(next);
          return next;
        });
        const itemsSummary = items
          .map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`)
          .join(', ');
        toast.success(`Saída de ${items.length} item(ns) realizada com sucesso para ${sector}! (${itemsSummary})`);
      } catch (err: any) {
        toast.warning(err.message || 'Erro ao registrar saída de itens');
        throw err;
      }
    },
    [currentUser?.role]
  );

  const handleUpdateMovement = useCallback(
    async (
      movementId: string,
      updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }
    ) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode alterar movimentações.');
        return;
      }
      try {
        const result = await updateStockMovementTransaction(movementId, updatedData);
        setProducts((prev) => {
          const next = prev.map((p) => result.updatedProducts.find((u) => u.id === p.id) || p);
          saveProducts(next);
          return next;
        });
        setMovements((prev) => {
          const updated = prev.map((m) =>
            m.id === movementId ? { ...m, isCompensated: true } : m
          );
          const toAdd = [result.movement];
          if (result.compensationMovement) toAdd.push(result.compensationMovement);
          const next = [...toAdd, ...updated];
          saveMovements(next);
          return next;
        });
        toast.success('Movimentação atualizada e saldo de estoque recalculado com sucesso!');
      } catch (err: any) {
        toast.warning(err.message || 'Erro ao atualizar movimentação');
        throw err;
      }
    },
    [currentUser?.role]
  );

  const handleDeleteMovement = useCallback(
    async (movementId: string) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode excluir movimentações.');
        return;
      }
      if (isMarcoZeroRecord(movementId)) {
        toast.error('O Marco Zero Oficial é protegido contra exclusão física.');
        return;
      }
      try {
        const compResult = await deleteStockMovementTransaction(movementId);
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === compResult.updatedProduct.id ? compResult.updatedProduct : p));
          saveProducts(next);
          return next;
        });
        setMovements((prev) => {
          const next = [
            compResult.compensationMovement,
            ...prev.map((m) =>
              m.id === movementId
                ? {
                    ...m,
                    isCompensated: true,
                    compensatedByMovementId: compResult.compensationMovement.id,
                  }
                : m
            ),
          ];
          saveMovements(next);
          return next;
        });
        toast.success('Movimentação estornada com sucesso e saldo recalculado!');
      } catch (err: any) {
        toast.warning(err.message || 'Erro ao excluir movimentação');
        throw err;
      }
    },
    [currentUser?.role]
  );

  const handleDeliverKit = useCallback(
    async (
      kitToDeliver: DailyKit,
      retrievedBy: string,
      deliveredBy: string,
      date: string,
      time: string,
      saveAsDefault?: boolean,
      clientRequestId?: string
    ) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode efetivar baixa do Kit Cozinha.');
        return;
      }
      try {
        if (saveAsDefault) {
          await saveDailyKitToFirestore(kitToDeliver);
          setDailyKit(kitToDeliver);
          saveDailyKit(kitToDeliver);
        }
        const result = await executeDailyKitTransaction(
          kitToDeliver,
          retrievedBy,
          deliveredBy,
          date,
          time,
          clientRequestId
        );
        setProducts((prev) =>
          prev.map((p) => result.updatedProducts.find((u) => u.id === p.id) || p)
        );
        setMovements((prev) => [
          ...result.movements,
          ...prev.filter((m) => !result.movements.some((r) => r.id === m.id)),
        ]);
        toast.success(
          `⚡ Kit Diário da Cozinha baixado com sucesso! (${result.deliveredCount} itens atualizados)${
            saveAsDefault ? ' - Novo modelo padrão salvo!' : ''
          }`
        );
      } catch (err: any) {
        toast.warning(err.message || 'Não foi possível baixar o Kit Diário.');
        throw err;
      }
    },
    [currentUser?.role]
  );

  const handleSaveProduct = useCallback(
    async (updatedProd: Product) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode editar dados cadastrais de produtos.');
        return;
      }
      try {
        await saveProductToFirestore(updatedProd);
        setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
        toast.info(`Produto ${updatedProd.name} atualizado e sincronizado online!`);
      } catch (err: any) {
        toast.warning(err.message || 'Erro ao salvar produto.');
      }
    },
    [currentUser?.role]
  );

  const handleAddProduct = useCallback(
    async (newProdData: Omit<Product, 'id' | 'lastUpdated'>) => {
      if (currentUser?.role !== 'admin') {
        toast.warning('Apenas o Administrador do Estoque pode cadastrar novos produtos.');
        return;
      }
      const newProd: Product = {
        ...newProdData,
        id: `prod-${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };
      try {
        await saveProductToFirestore(newProd);
        setProducts((prev) => [newProd, ...prev]);
        toast.success(`Novo produto ${newProd.name} cadastrado com sucesso!`);
      } catch (err: any) {
        toast.warning(err.message || 'Erro ao cadastrar produto.');
      }
    },
    [currentUser?.role]
  );

  return {
    products,
    setProducts,
    movements,
    setMovements,
    dailyKit,
    setDailyKit,
    missionaries,
    setMissionaries,
    meals,
    setMeals,
    inventoryAudits,
    setInventoryAudits,
    inventorySessions,
    setInventorySessions,
    dataReady,
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
  };
}
