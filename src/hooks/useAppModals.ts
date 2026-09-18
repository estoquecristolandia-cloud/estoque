import { useState, useCallback } from 'react';
import { Product } from '../types';

export function useAppModals() {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [isMissionariesModalOpen, setIsMissionariesModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isPhysicalInventoryOpen, setIsPhysicalInventoryOpen] = useState(false);
  const [isReconciliationPreviewOpen, setIsReconciliationPreviewOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [timelineProduct, setTimelineProduct] = useState<Product | null>(null);
  const [selectedProductForAction, setSelectedProductForAction] = useState<Product | null>(null);
  const [actionInitialDate, setActionInitialDate] = useState<string | null>(null);

  const handleOpenEntryModal = useCallback((product?: Product | null, initialDate?: string | null) => {
    setSelectedProductForAction(product || null);
    setActionInitialDate(initialDate || null);
    setIsEntryModalOpen(true);
  }, []);

  const handleOpenExitModal = useCallback((product?: Product | null, initialDate?: string | null) => {
    setSelectedProductForAction(product || null);
    setActionInitialDate(initialDate || null);
    setIsExitModalOpen(true);
  }, []);

  const handleOpenTimeline = useCallback((product: Product) => {
    setTimelineProduct(product);
  }, []);

  const handleOpenTimelineById = useCallback((productId: string, products: Product[]) => {
    const p = products.find((prod) => prod.id === productId);
    if (p) {
      setTimelineProduct(p);
    }
  }, []);

  return {
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
  };
}
