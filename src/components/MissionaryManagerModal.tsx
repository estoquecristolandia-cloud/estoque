import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Check, Clock, RotateCcw, UserCheck, Lock } from 'lucide-react';
import { Missionary, Sector, KitchenShift } from '../types';
import { UserRole } from '../firebase';
import { INITIAL_MISSIONARIES } from '../data/initialData';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface MissionaryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionaries: Missionary[];
  onSaveMissionaries: (missionaries: Missionary[]) => void;
  userRole?: UserRole;
}

const SECTORS: Sector[] = [
  'Casa Missionária Masculina',
  'Casa Missionária Feminina',
  'Administração',
  'Casa da Coordenação (Huberto & Débora)',
  'Casa Lana & Joabe (Cesta Básica)',
  'Casa Marcos & Fabíola (Cesta Básica)',
  'Casa Tainã (Cesta Básica)',
  'Cozinha',
  'Padaria',
  'Eventos',
  'Outros',
];

const KITCHEN_SHIFTS: KitchenShift[] = [
  'Café / Manhã',
  'Almoço',
  'Jantar / Tarde',
  'Ceia / Lanche',
];

export const MissionaryManagerModal: React.FC<MissionaryManagerModalProps> = ({
  isOpen,
  onClose,
  missionaries,
  onSaveMissionaries,
  userRole = 'admin',
}) => {
  const isAdmin = userRole === 'admin';
  const [activeTab, setActiveTab] = useState<Sector | 'all'>('all');
  const [editingMissionary, setEditingMissionary] = useState<Missionary | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sector, setSector] = useState<Sector>('Casa Missionária Masculina');
  const [role, setRole] = useState('');
  const [shift, setShift] = useState<KitchenShift>('Almoço');

  if (!isOpen) return null;

  const handleEdit = (m: Missionary) => {
    if (!isAdmin) return;
    setEditingMissionary(m);
    setName(m.name);
    setSector(m.sector);
    setRole(m.role);
    setShift(m.shift || 'Almoço');
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (confirm('Deseja remover este missionário da lista?')) {
      const updated = missionaries.filter((m) => m.id !== id);
      onSaveMissionaries(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!name.trim()) return;

    const mData: Missionary = {
      id: editingMissionary ? editingMissionary.id : `m-${Date.now()}`,
      name: name.trim(),
      sector,
      role: role.trim() || (sector === 'Cozinha' ? `Responsável Cozinha (${shift})` : 'Missionário Responsável'),
      shift: sector === 'Cozinha' ? shift : undefined,
    };

    if (editingMissionary) {
      const updated = missionaries.map((m) => (m.id === mData.id ? mData : m));
      onSaveMissionaries(updated);
    } else {
      onSaveMissionaries([...missionaries, mData]);
    }

    setName('');
    setRole('');
    setEditingMissionary(null);
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    if (confirm('Deseja restaurar a lista oficial de missionários e turnos da Cristolândia?')) {
      onSaveMissionaries(INITIAL_MISSIONARIES);
    }
  };

  const filteredMissionaries = missionaries.filter((m) =>
    activeTab === 'all' ? true : m.sector === activeTab
  );

  return (
    <ModalWrapper
      id="missionary-manager-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Equipe de Missionários & Turnos"
      subtitle="Cadastro de responsáveis pelas casas masculinas, femininas, administração e escalas"
      icon={<Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="primary" onClick={onClose}>
            Concluído
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top Sector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todos ({missionaries.length})
          </button>
          {SECTORS.map((sec) => {
            const count = missionaries.filter((m) => m.sector === sec).length;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setActiveTab(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === sec
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sec} ({count})
              </button>
            );
          })}
        </div>

        {/* Form to Add / Edit Missionary (Admin Only) */}
        {isAdmin ? (
          <form onSubmit={handleSave} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-500" />
                {editingMissionary ? 'Editar Missionário / Responsável' : '+ Cadastrar Novo Missionário'}
              </span>
              {editingMissionary && (
                <button
                  type="button"
                  onClick={() => setEditingMissionary(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Missionário Carlos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Setor de Atuação</label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value as Sector)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Função / Cargo</label>
                <input
                  type="text"
                  placeholder="Ex: Líder de Casa ou Cozinheiro"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Kitchen Shift if sector is Cozinha */}
            {sector === 'Cozinha' && (
              <div className="bg-amber-50/80 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                    Turno da Cozinha Responsável:
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as KitchenShift)}
                    className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 w-full"
                  >
                    {KITCHEN_SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="warning"
                icon={<Check className="w-4 h-4" />}
              >
                {editingMissionary ? 'Atualizar Dados' : 'Adicionar Missionário'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/50 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-blue-800 dark:text-blue-300">
            <Lock className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Modo de Visualização: Apenas o administrador possui privilégios para cadastrar ou alterar missionários.</span>
          </div>
        )}

        {/* Missionary Roster List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Lista de Missionários Cadastrados ({filteredMissionaries.length})
            </h4>
            {isAdmin && (
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Lista Padrão</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredMissionaries.map((m) => (
              <div
                key={m.id}
                className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <Badge variant="neutral" className="mb-1">
                    {m.sector}
                  </Badge>
                  <h5 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                    {m.name}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {m.role}
                  </p>
                  {m.shift && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      <Clock className="w-3 h-3" /> Turno: {m.shift}
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filteredMissionaries.length === 0 && (
              <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                Nenhum missionário cadastrado para este setor.
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};

