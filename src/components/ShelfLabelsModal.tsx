import React, { useState, useMemo } from 'react';
import {
  X,
  Barcode,
  Printer,
  CheckSquare,
  Square,
  Search,
  Check,
  FileDown,
  Sparkles,
  MapPin,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { Product } from '../types';
import { generateShelfLabelsPdf, ShelfLabelsOptions } from '../utils/labelPdfGenerator';

interface ShelfLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialSelectedProductId?: string;
}

export const ShelfLabelsModal: React.FC<ShelfLabelsModalProps> = ({
  isOpen,
  onClose,
  products,
  initialSelectedProductId,
}) => {
  // Inicialização com todos selecionados ou o item específico
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelectedProductId) {
      return new Set([initialSelectedProductId]);
    }
    return new Set(products.map((p) => p.id));
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [format, setFormat] = useState<'large' | 'compact'>('large');
  const [showLocation, setShowLocation] = useState(true);
  const [showMinStock, setShowMinStock] = useState(true);
  const [showConsumption, setShowConsumption] = useState(true);
  const [showCutLines, setShowCutLines] = useState(true);
  const [showInstitutionalHeader, setShowInstitutionalHeader] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filtra produtos pela busca
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.location && p.location.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  // Primeiro produto selecionado para o preview ao vivo
  const previewProduct = useMemo(() => {
    const firstSelected = products.find((p) => selectedIds.has(p.id));
    return firstSelected || products[0];
  }, [products, selectedIds]);

  if (!isOpen) return null;

  const handleToggleProduct = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleGeneratePdf = () => {
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    if (selectedProducts.length === 0) return;

    setIsGenerating(true);
    try {
      const options: ShelfLabelsOptions = {
        format,
        showLocation,
        showMinStock,
        showConsumption,
        showCutLines,
        showInstitutionalHeader,
      };
      generateShelfLabelsPdf(selectedProducts, options);
    } catch (err) {
      console.error('Erro ao gerar PDF de etiquetas:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Central de Etiquetas de Prateleira & Paletes
              </h2>
              <p className="text-xs text-slate-400">
                Gere folhas A4 prontas para impressão com Código de Barras vetorial para identificação física no galpão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Grid Superior: Configurações + Preview ao Vivo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna 1: Opções de Formato e Conteúdo (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Formato da Folha A4
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat('large')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      format === 'large'
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      Grande (8 por folha)
                      {format === 'large' && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      2 colunas × 4 linhas (92×65mm). Ideal para Paletes e Prateleiras principais.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('compact')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      format === 'compact'
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      Compacta (12 por folha)
                      {format === 'compact' && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      2 colunas × 6 linhas (92×44mm). Ideal para Caixas plásticas e gaveteiros.
                    </div>
                  </button>
                </div>

                {/* Opções de Elementos na Etiqueta */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-400">Elementos Visíveis:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLocation}
                        onChange={(e) => setShowLocation(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <span>Localização (Palete)</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showMinStock}
                        onChange={(e) => setShowMinStock(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <span>Estoque Mínimo</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showConsumption}
                        onChange={(e) => setShowConsumption(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <span>Consumo Diário</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCutLines}
                        onChange={(e) => setShowCutLines(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <span>Guias de Corte</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showInstitutionalHeader}
                        onChange={(e) => setShowInstitutionalHeader(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <span>Cabeçalho Institucional</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Pré-visualização Realista da Etiqueta (5 cols) */}
            <div className="lg:col-span-5 space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Exemplo de Impressão na Folha
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {format === 'large' ? '92 × 65 mm' : '92 × 44 mm'}
                </span>
              </div>

              {previewProduct ? (
                <div className="bg-white text-slate-900 rounded-xl p-3 border-2 border-dashed border-slate-300 shadow-lg relative overflow-hidden font-sans select-none">
                  {/* Linha de corte indicativa */}
                  <div className="absolute top-1 right-2 text-[8px] text-slate-400 uppercase font-mono tracking-widest">
                    Corte ✂
                  </div>

                  {/* Faixa Institucional */}
                  {showInstitutionalHeader && (
                    <div className="bg-slate-950 text-white text-[8.5px] font-bold text-center py-1 rounded tracking-wider uppercase mb-2">
                      CRISTOLÂNDIA LEM • GESTÃO DE ALMOXARIFADO
                    </div>
                  )}

                  {/* Nome do Produto */}
                  <div className="font-extrabold text-sm sm:text-base leading-snug uppercase text-slate-900 line-clamp-2">
                    {previewProduct.name}
                  </div>

                  {/* Categoria e Unidade */}
                  <div className="text-[9px] text-slate-500 uppercase tracking-wide font-medium mt-1 mb-1.5">
                    {previewProduct.category} • UNIDADE: {previewProduct.unit}
                  </div>

                  {/* Bloco de Logística */}
                  {(showLocation || showMinStock || showConsumption) && format === 'large' && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-1.5 mt-1.5 text-[9px] space-y-0.5">
                      {showLocation && (
                        <div className="font-bold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-blue-600" />
                          LOCAL: {(previewProduct.location || 'Depósito Principal').toUpperCase()}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        {showMinStock && (
                          <span className="font-bold text-red-600">
                            MÍNIMO: {previewProduct.minStock} {previewProduct.unit}
                          </span>
                        )}
                        {showConsumption && (
                          <span className="font-bold text-blue-600">
                            CONSUMO: {previewProduct.dailyAvgConsumption} {previewProduct.unit}/dia
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Código de Barras Simulado */}
                  <div className="mt-2 text-center">
                    <div className="h-9 flex items-center justify-center gap-[2px] bg-slate-100/60 p-1 rounded">
                      {/* Simulação gráfica nítida de barras Code128 */}
                      {Array.from({ length: 38 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-full bg-slate-950"
                          style={{
                            width: i % 5 === 0 ? '3px' : i % 3 === 0 ? '2px' : '1px',
                            opacity: i % 7 === 2 || i % 11 === 4 ? 0 : 1,
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-[8.5px] font-mono font-bold text-slate-600 mt-1">
                      * {previewProduct.barcode || previewProduct.id} *
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  Nenhum produto selecionado para exibição.
                </div>
              )}
            </div>
          </div>

          {/* Seção Inferior: Seleção dos Produtos */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Produtos para Impressão ({selectedIds.size} de {products.length})
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                  {Math.ceil(selectedIds.size / (format === 'large' ? 8 : 12))} folha(s) A4
                </span>
              </div>

              {/* Botões Rápidos e Campo de Busca */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  Todos
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  Limpar
                </button>

                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Grid com os Alimentos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
              {filteredProducts.map((prod) => {
                const isSelected = selectedIds.has(prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleToggleProduct(prod.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/50 text-white'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate text-white">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>{prod.location || 'Depósito'}</span>
                          <span>•</span>
                          <span>{prod.currentStock} {prod.unit}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                      {prod.barcode ? '✓ EAN' : 'ID'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={selectedIds.size === 0 || isGenerating}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isGenerating
                ? 'Gerando Folha A4...'
                : `Gerar PDF de Etiquetas (${selectedIds.size} ${selectedIds.size === 1 ? 'item' : 'itens'})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
