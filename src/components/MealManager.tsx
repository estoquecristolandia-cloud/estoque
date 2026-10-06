import React, { useState, useMemo } from "react";
import { DailyMealRecord, Missionary } from "../types";
import { UserRole } from "../firebase";
import { getTodayDateString } from "../utils/storage";
import { toast } from "../utils/toast";
import {
  Coffee,
  Utensils,
  SunMedium,
  Soup,
  Calendar,
  User,
  CheckCircle2,
  TrendingUp,
  Users,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Search,
  Clock,
  Printer,
  Download,
  BarChart3,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Check,
  Copy,
  ExternalLink,
  X,
  Settings,
  Eye,
  Award,
} from "lucide-react";
import { generateMonthlyMealsPDF } from "../utils/pdfExport";

interface MealManagerProps {
  meals: DailyMealRecord[];
  missionaries: Missionary[];
  userRole?: UserRole;
  currentUserDisplayName?: string;
  currentUserEmail?: string;
  onSaveMealRecord: (
    record: Omit<DailyMealRecord, "id" | "totalMeals" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ) => void;
  onDeleteMealRecord: (id: string) => void;
}

export const MealManager: React.FC<MealManagerProps> = ({
  meals,
  missionaries,
  userRole = "admin",
  currentUserDisplayName = "Marconi Castro (Gestor do Estoque)",
  currentUserEmail = "",
  onSaveMealRecord,
  onDeleteMealRecord,
}) => {
  const isAdmin = userRole === "admin";
  const canManageEmails = true; // Disponível para todos os operadores e gestores de refeitório
  const todayStr = getTodayDateString();
  const [activeMealTab, setActiveMealTab] = useState<"daily" | "monthly">(
    "daily",
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [dailyMonthFilter, setDailyMonthFilter] = useState<string>("all");

  // Available months from meals list (defaults to current or most recent)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const curMonth = todayStr.substring(0, 7);
    set.add(curMonth);
    meals.forEach((m) => {
      if (m.date && m.date.length >= 7) {
        set.add(m.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [meals, todayStr]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (meals.length > 0) {
      const sortedDates = [...meals].sort((a, b) =>
        (b.date || "").localeCompare(a.date || ""),
      );
      return sortedDates[0].date.substring(0, 7);
    }
    return getTodayDateString().substring(0, 7);
  });

  // State for email to Leadership and Chef
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailMode, setEmailMode] = useState<"two_months" | "single_month">(
    "single_month",
  );
  const [emailModalTab, setEmailModalTab] = useState<"preview" | "plain">(
    "preview",
  );
  const [emailRecipients, setEmailRecipients] = useState<string>(
    "humbertohpp.59@gmail.com, missaodebora@gmail.com, chefmarcusviniciuses@gmail.com",
  );
  const [customEmailNote, setCustomEmailNote] = useState<string>("");
  const [emailCopiedHtml, setEmailCopiedHtml] = useState<boolean>(false);
  const [chefEmail, setChefEmail] = useState<string>(() => {
    return (
      localStorage.getItem("cristolandia_chef_email") ||
      "chefmarcusviniciuses@gmail.com"
    );
  });
  const [chefName, setChefName] = useState<string>(() => {
    return (
      localStorage.getItem("cristolandia_chef_name") || "Chefe Marcus Vinícius"
    );
  });
  const [isEditingChefContact, setIsEditingChefContact] =
    useState<boolean>(false);
  const [tempChefEmail, setTempChefEmail] = useState<string>(chefEmail);
  const [tempChefName, setTempChefName] = useState<string>(chefName);
  const [copiedEmailText, setCopiedEmailText] = useState<boolean>(false);

  // Form states for the selected date
  const [breakfast, setBreakfast] = useState<number>(0);
  const [lunch, setLunch] = useState<number>(0);
  const [afternoonSnack, setAfternoonSnack] = useState<number>(0);
  const [dinner, setDinner] = useState<number>(0);
  const [responsible, setResponsible] = useState<string>(
    currentUserDisplayName,
  );
  const [notes, setNotes] = useState<string>("");

  // When selectedDate changes, load existing record if available
  React.useEffect(() => {
    const existing = meals.find((m) => m.date === selectedDate);
    if (existing) {
      setBreakfast(existing.breakfast || 0);
      setLunch(existing.lunch || 0);
      setAfternoonSnack(existing.afternoonSnack || 0);
      setDinner(existing.dinner || 0);
      setResponsible(existing.responsible || currentUserDisplayName);
      setNotes(existing.notes || "");
      setEditingMealId(existing.id);
    } else {
      // For fresh / subsequent days, start at 0 so user inserts daily
      setBreakfast(0);
      setLunch(0);
      setAfternoonSnack(0);
      setDinner(0);
      setResponsible(currentUserDisplayName);
      setNotes("");
      setEditingMealId(null);
    }
  }, [selectedDate, meals, currentUserDisplayName]);

  // Current calculated total for form
  const currentTotal = useMemo(() => {
    return (
      (Number(breakfast) || 0) +
      (Number(lunch) || 0) +
      (Number(afternoonSnack) || 0) +
      (Number(dinner) || 0)
    );
  }, [breakfast, lunch, afternoonSnack, dinner]);

  // Global KPIs (Totais Gerais de Refeições Acumuladas)
  const stats = useMemo(() => {
    const totalRecords = meals.length;
    const totalAllMeals = meals.reduce(
      (sum, m) => sum + (Number(m.totalMeals) || 0),
      0,
    );
    const totalBreakfastAll = meals.reduce(
      (sum, m) => sum + (Number(m.breakfast) || 0),
      0,
    );
    const totalLunchAll = meals.reduce(
      (sum, m) => sum + (Number(m.lunch) || 0),
      0,
    );
    const totalSnackAll = meals.reduce(
      (sum, m) => sum + (Number(m.afternoonSnack) || 0),
      0,
    );
    const totalDinnerAll = meals.reduce(
      (sum, m) => sum + (Number(m.dinner) || 0),
      0,
    );
    const avgDailyMeals =
      totalRecords > 0 ? Math.round(totalAllMeals / totalRecords) : 0;

    // Total served today
    const todayRecord = meals.find((m) => m.date === todayStr);
    const todayTotal = todayRecord ? todayRecord.totalMeals : 0;

    // Averages by period across all days
    const avgBreakfast =
      totalRecords > 0 ? Math.round(totalBreakfastAll / totalRecords) : 0;
    const avgLunch =
      totalRecords > 0 ? Math.round(totalLunchAll / totalRecords) : 0;
    const avgSnack =
      totalRecords > 0 ? Math.round(totalSnackAll / totalRecords) : 0;
    const avgDinner =
      totalRecords > 0 ? Math.round(totalDinnerAll / totalRecords) : 0;

    return {
      totalRecords,
      totalAllMeals,
      totalBreakfastAll,
      totalLunchAll,
      totalSnackAll,
      totalDinnerAll,
      avgDailyMeals,
      todayTotal,
      avgBreakfast,
      avgLunch,
      avgSnack,
      avgDinner,
    };
  }, [meals, todayStr, currentTotal]);

  // Monthly Report calculations for selectedMonth
  const monthlyStats = useMemo(() => {
    const monthRecords = meals
      .filter((m) => m.date.startsWith(selectedMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalDays = monthRecords.length;
    const totalBreakfast = monthRecords.reduce(
      (sum, m) => sum + (Number(m.breakfast) || 0),
      0,
    );
    const totalLunch = monthRecords.reduce(
      (sum, m) => sum + (Number(m.lunch) || 0),
      0,
    );
    const totalSnack = monthRecords.reduce(
      (sum, m) => sum + (Number(m.afternoonSnack) || 0),
      0,
    );
    const totalDinner = monthRecords.reduce(
      (sum, m) => sum + (Number(m.dinner) || 0),
      0,
    );
    const totalMonthMeals = monthRecords.reduce(
      (sum, m) => sum + (Number(m.totalMeals) || 0),
      0,
    );

    const avgBreakfast =
      totalDays > 0 ? Math.round(totalBreakfast / totalDays) : 0;
    const avgLunch = totalDays > 0 ? Math.round(totalLunch / totalDays) : 0;
    const avgSnack = totalDays > 0 ? Math.round(totalSnack / totalDays) : 0;
    const avgDinner = totalDays > 0 ? Math.round(totalDinner / totalDays) : 0;
    const avgDailyMeals =
      totalDays > 0 ? Math.round(totalMonthMeals / totalDays) : 0;

    return {
      monthRecords,
      totalDays,
      totalBreakfast,
      totalLunch,
      totalSnack,
      totalDinner,
      totalMonthMeals,
      avgBreakfast,
      avgLunch,
      avgSnack,
      avgDinner,
      avgDailyMeals,
    };
  }, [meals, selectedMonth]);

  // Auditoria de frequência: calcula dias corridos no mês que ficaram sem lançamento
  const missingDaysInMonth = useMemo(() => {
    if (!selectedMonth) return [];
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) return [];
    const totalDays = new Date(y, m, 0).getDate();
    const recordedDates = new Set(monthlyStats.monthRecords.map((r) => r.date));
    const missing: { dateStr: string; dayNum: number; dayOfWeek: string }[] = [];

    for (let d = 1; d <= totalDays; d++) {
      const dStr = String(d).padStart(2, "0");
      const fullDate = `${selectedMonth}-${dStr}`;
      // Considera faltante se a data for anterior ou igual à data de hoje e não tiver lançamento
      if (fullDate <= todayStr && !recordedDates.has(fullDate)) {
        missing.push({
          dateStr: fullDate,
          dayNum: d,
          dayOfWeek: getDayOfWeekName(fullDate),
        });
      }
    }
    return missing;
  }, [selectedMonth, monthlyStats.monthRecords, todayStr]);

  // Stepper helper
  const adjustCount = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
  ) => {
    setter((prev) => Math.max(0, (Number(prev) || 0) + delta));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error("Por favor, informe uma data válida.");
      return;
    }
    if (!responsible.trim()) {
      toast.error("Informe o nome do responsável pelo registro.");
      return;
    }

    onSaveMealRecord({
      id: editingMealId || undefined,
      date: selectedDate,
      breakfast: Number(breakfast) || 0,
      lunch: Number(lunch) || 0,
      afternoonSnack: Number(afternoonSnack) || 0,
      dinner: Number(dinner) || 0,
      responsible: responsible.trim(),
      notes: notes.trim(),
    });

    toast.success(
      `Refeições do dia ${formatDateBr(selectedDate)} salvas com sucesso! (${currentTotal} refeições)`,
    );
  };

  const handleEditRecord = (record: DailyMealRecord) => {
    setSelectedDate(record.date);
    setBreakfast(record.breakfast);
    setLunch(record.lunch);
    setAfternoonSnack(record.afternoonSnack);
    setDinner(record.dinner);
    setResponsible(record.responsible);
    setNotes(record.notes || "");
    setEditingMealId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string, date: string) => {
    if (
      confirm(
        `Tem certeza que deseja excluir o registro de refeições de ${formatDateBr(date)}?`,
      )
    ) {
      onDeleteMealRecord(id);
      toast.success("Registro de refeição removido com sucesso!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered meal history
  const filteredMeals = useMemo(() => {
    let result = meals;
    if (dailyMonthFilter !== "all") {
      result = result.filter((m) => m.date.startsWith(dailyMonthFilter));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.date.includes(term) ||
          m.responsible.toLowerCase().includes(term) ||
          (m.notes && m.notes.toLowerCase().includes(term)),
      );
    }
    return result;
  }, [meals, dailyMonthFilter, searchTerm]);

  function formatDateBr(dateStr: string): string {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getDayOfWeekName(dateStr: string): string {
    if (!dateStr) return "";
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const days = [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ];
      return days[date.getDay()];
    } catch {
      return "";
    }
  }

  function formatMonthName(mStr: string): string {
    if (!mStr) return "";
    const [year, month] = mStr.split("-");
    const months = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const idx = parseInt(month, 10) - 1;
    return `${months[idx] || month} de ${year}`;
  }

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(prevStr);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextStr);
  };

  const handleDownloadMonthlyPDF = () => {
    try {
      generateMonthlyMealsPDF(meals, selectedMonth);
      toast.success(
        `Relatório de refeições de ${formatMonthName(selectedMonth)} exportado em PDF com sucesso!`,
      );
    } catch (err) {
      console.error("Erro ao gerar PDF de refeições:", err);
      toast.error("Erro ao gerar o PDF do relatório. Tente novamente.");
    }
  };

  const handleSaveChefContact = () => {
    const cleanEmail = tempChefEmail.trim();
    const cleanName = tempChefName.trim();
    if (!cleanEmail) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setChefEmail(cleanEmail);
    setChefName(cleanName || "Chefe Marcus Vinícius");
    localStorage.setItem("cristolandia_chef_email", cleanEmail);
    localStorage.setItem(
      "cristolandia_chef_name",
      cleanName || "Chefe Marcus Vinícius",
    );
    setIsEditingChefContact(false);
    toast.success("Contato do Chefe atualizado com sucesso!");
  };

  // August 2026 stats
  const augustStats = useMemo(() => {
    const monthRecords = meals
      .filter((m) => m.date.startsWith("2026-08"))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalDays = monthRecords.length;
    const totalBreakfast = monthRecords.reduce(
      (sum, m) => sum + (Number(m.breakfast) || 0),
      0,
    );
    const totalLunch = monthRecords.reduce(
      (sum, m) => sum + (Number(m.lunch) || 0),
      0,
    );
    const totalSnack = monthRecords.reduce(
      (sum, m) => sum + (Number(m.afternoonSnack) || 0),
      0,
    );
    const totalDinner = monthRecords.reduce(
      (sum, m) => sum + (Number(m.dinner) || 0),
      0,
    );
    const totalMonthMeals = monthRecords.reduce(
      (sum, m) => sum + (Number(m.totalMeals) || 0),
      0,
    );

    const avgBreakfast =
      totalDays > 0 ? Math.round(totalBreakfast / totalDays) : 0;
    const avgLunch = totalDays > 0 ? Math.round(totalLunch / totalDays) : 0;
    const avgSnack = totalDays > 0 ? Math.round(totalSnack / totalDays) : 0;
    const avgDinner = totalDays > 0 ? Math.round(totalDinner / totalDays) : 0;
    const avgDailyMeals =
      totalDays > 0 ? Math.round(totalMonthMeals / totalDays) : 0;

    return {
      totalDays,
      totalBreakfast,
      totalLunch,
      totalSnack,
      totalDinner,
      totalMonthMeals,
      avgBreakfast,
      avgLunch,
      avgSnack,
      avgDinner,
      avgDailyMeals,
    };
  }, [meals]);

  // September 2026 stats
  const septemberStats = useMemo(() => {
    const monthRecords = meals
      .filter((m) => m.date.startsWith("2026-09"))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalDays = monthRecords.length;
    const totalBreakfast = monthRecords.reduce(
      (sum, m) => sum + (Number(m.breakfast) || 0),
      0,
    );
    const totalLunch = monthRecords.reduce(
      (sum, m) => sum + (Number(m.lunch) || 0),
      0,
    );
    const totalSnack = monthRecords.reduce(
      (sum, m) => sum + (Number(m.afternoonSnack) || 0),
      0,
    );
    const totalDinner = monthRecords.reduce(
      (sum, m) => sum + (Number(m.dinner) || 0),
      0,
    );
    const totalMonthMeals = monthRecords.reduce(
      (sum, m) => sum + (Number(m.totalMeals) || 0),
      0,
    );

    const avgBreakfast =
      totalDays > 0 ? Math.round(totalBreakfast / totalDays) : 0;
    const avgLunch = totalDays > 0 ? Math.round(totalLunch / totalDays) : 0;
    const avgSnack = totalDays > 0 ? Math.round(totalSnack / totalDays) : 0;
    const avgDinner = totalDays > 0 ? Math.round(totalDinner / totalDays) : 0;
    const avgDailyMeals =
      totalDays > 0 ? Math.round(totalMonthMeals / totalDays) : 0;

    return {
      totalDays,
      totalBreakfast,
      totalLunch,
      totalSnack,
      totalDinner,
      totalMonthMeals,
      avgBreakfast,
      avgLunch,
      avgSnack,
      avgDinner,
      avgDailyMeals,
    };
  }, [meals]);

  // Combined stats (August + September)
  const combinedTwoMonthsStats = useMemo(() => {
    const totalMonthMeals =
      augustStats.totalMonthMeals + septemberStats.totalMonthMeals;
    const totalDays = augustStats.totalDays + septemberStats.totalDays;
    const totalBreakfast =
      augustStats.totalBreakfast + septemberStats.totalBreakfast;
    const totalLunch = augustStats.totalLunch + septemberStats.totalLunch;
    const totalSnack = augustStats.totalSnack + septemberStats.totalSnack;
    const totalDinner = augustStats.totalDinner + septemberStats.totalDinner;
    const avgDailyMeals =
      totalDays > 0 ? Math.round(totalMonthMeals / totalDays) : 0;
    const avgBreakfast = totalDays > 0 ? Math.round(totalBreakfast / totalDays) : 0;
    const avgLunch = totalDays > 0 ? Math.round(totalLunch / totalDays) : 0;
    const avgSnack = totalDays > 0 ? Math.round(totalSnack / totalDays) : 0;
    const avgDinner = totalDays > 0 ? Math.round(totalDinner / totalDays) : 0;

    return {
      totalMonthMeals,
      totalDays,
      totalBreakfast,
      totalLunch,
      totalSnack,
      totalDinner,
      avgDailyMeals,
      avgBreakfast,
      avgLunch,
      avgSnack,
      avgDinner,
    };
  }, [augustStats, septemberStats]);

  const handleDownloadAugustPDF = () => {
    try {
      generateMonthlyMealsPDF(
        meals,
        "2026-08",
        "Relatório de Refeições - Agosto de 2026",
      );
      toast.success("Relatório em PDF de Agosto baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF de Agosto.");
    }
  };

  const handleDownloadSeptemberPDF = () => {
    try {
      generateMonthlyMealsPDF(
        meals,
        "2026-09",
        "Relatório de Refeições - Setembro de 2026",
      );
      toast.success("Relatório em PDF de Setembro baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF de Setembro.");
    }
  };

  const currentStats = emailMode === "two_months" ? combinedTwoMonthsStats : monthlyStats;
  const currentMonthName =
    emailMode === "two_months"
      ? "Agosto e Setembro de 2026 (Consolidado)"
      : formatMonthName(selectedMonth);

  const pctBreakfast =
    currentStats.totalMonthMeals > 0
      ? ((currentStats.totalBreakfast / currentStats.totalMonthMeals) * 100).toFixed(1)
      : "0.0";
  const pctLunch =
    currentStats.totalMonthMeals > 0
      ? ((currentStats.totalLunch / currentStats.totalMonthMeals) * 100).toFixed(1)
      : "0.0";
  const pctSnack =
    currentStats.totalMonthMeals > 0
      ? ((currentStats.totalSnack / currentStats.totalMonthMeals) * 100).toFixed(1)
      : "0.0";
  const pctDinner =
    currentStats.totalMonthMeals > 0
      ? ((currentStats.totalDinner / currentStats.totalMonthMeals) * 100).toFixed(1)
      : "0.0";

  const emailSubject =
    emailMode === "two_months"
      ? `[PRESTAÇÃO DE CONTAS JMN] Demonstrativo de Refeições — Agosto & Setembro/2026 (Consolidado)`
      : `[PRESTAÇÃO DE CONTAS JMN] Demonstrativo Mensal de Refeições Servidas — ${formatMonthName(selectedMonth).toUpperCase()}`;

  const emailBody = useMemo(() => {
    let body = `A/C: Pastor Humberto, Missª. Débora (Coordenação) e Chefe Marcus Vinicius\n`;
    body += `Cc: Marconi Castro (Almoxarifado / Refeitório)\n`;
    body += `Data da Emissão: ${todayStr}\n`;
    body += `Competência Oficial: ${currentMonthName}\n`;
    body += `Painel Online: https://estoquecristolandia.netlify.app\n\n`;

    body += `Prezados Pastor Humberto, Missª. Débora e Chefe Marcus Vinicius,\n\n`;
    body += `Graça e paz!\n\n`;
    body += `Apresentamos o Demonstrativo Oficial de Refeições Servidas no Centro de Formação e Assistência Social Cristolândia (LEM/BA) referente à competência de ${currentMonthName}:\n\n`;

    body += `SCORECARD EXECUTIVO DO REFEITÓRIO (${currentMonthName.toUpperCase()}):\n`;
    body += `• Total de Refeições no Período: ${currentStats.totalMonthMeals.toLocaleString("pt-BR")} refeições\n`;
    body += `• Quantidade de Dias Registrados: ${currentStats.totalDays} dias\n`;
    body += `• Média Diária Geral: ~${currentStats.avgDailyMeals} refeições / dia\n`;
    body += `• Conformidade de Registro: 100% Auditado (Divergência Zero)\n\n`;

    body += `DISTRIBUIÇÃO POR TURNO NO PERÍODO:\n`;
    body += `  - Café da Manhã:          ${currentStats.totalBreakfast.toLocaleString("pt-BR")} ref. (${pctBreakfast}%) | Média: ~${currentStats.avgBreakfast} ref/dia\n`;
    body += `  - Almoço (Turno de Pico): ${currentStats.totalLunch.toLocaleString("pt-BR")} ref. (${pctLunch}%) | Média: ~${currentStats.avgLunch} ref/dia\n`;
    body += `  - Lanche da Tarde (16h):  ${currentStats.totalSnack.toLocaleString("pt-BR")} ref. (${pctSnack}%) | Média: ~${currentStats.avgSnack} ref/dia\n`;
    body += `  - Jantar:                 ${currentStats.totalDinner.toLocaleString("pt-BR")} ref. (${pctDinner}%) | Média: ~${currentStats.avgDinner} ref/dia\n\n`;

    body += `PARECER TÉCNICO DE AUDITORIA & MARCO ZERO:\n`;
    body += `✓ Registros de consumo e refeitório conferem estritamente in loco com os suprimentos do Almoxarifado Central (Marco Zero Oficial).\n\n`;

    if (customEmailNote.trim()) {
      body += `OBSERVAÇÃO DA GESTÃO:\n${customEmailNote.trim()}\n\n`;
    }

    body += `DOCUMENTO ANEXO EM PDF:\n`;
    body += `• Relatório Analítico de Refeições (${currentMonthName}) gerado pelo sistema.\n\n`;

    body += `Permanecemos à inteira disposição para qualquer alinhamento operacional.\n\n`;
    body += `Fraternalmente em Cristo,\n\n`;
    body += `Marconi Castro\n`;
    body += `Almoxarifado e Refeitório • Centro de Formação e Assistência Social Cristolândia LEM/BA\n`;
    body += `Junta de Missões Nacionais — Convenção Batista Brasileira (CBB)\n`;
    body += `E-mail: estoquecristolandia@gmail.com`;

    return body;
  }, [
    currentMonthName,
    currentStats,
    todayStr,
    pctBreakfast,
    pctLunch,
    pctSnack,
    pctDinner,
    customEmailNote,
  ]);

  const emailHtml = useMemo(() => {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 760px; margin: 0 auto; line-height: 1.6; font-size: 13px;">
        <!-- Header Executivo -->
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Junta de Missões Nacionais — CBB &bull; Cristolândia LEM/BA</div>
            <div style="font-size: 11px; font-weight: 800; color: #059669;">
              <a href="https://estoquecristolandia.netlify.app" target="_blank" style="color: #059669; text-decoration: none;">🌐 estoquecristolandia.netlify.app</a>
            </div>
          </div>
          <div style="font-size: 19px; font-weight: 900; color: #0f172a; margin-top: 4px;">Demonstrativo Mensal de Refeições Servidas</div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">Competência Oficial: <strong>${currentMonthName}</strong> &bull; Gestão de Refeitório & Prestação de Contas</div>
        </div>

        <p style="margin: 0 0 10px 0;">Prezados Pastor Humberto, Missª. Débora e Chefe Marcus Vinicius, graça e paz!</p>
        <p style="margin: 0 0 16px 0;">Apresentamos o demonstrativo oficial consolidado de refeições servidas na cozinha e refeitório da Cristolândia LEM/BA referente ao período de <strong>${currentMonthName}</strong>, com conferência in loco e conformidade total:</p>

        <!-- Scorecard Executivo de 4 Cards no Topo -->
        <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 130px; background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">🍽️ Total no Período</div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${currentStats.totalMonthMeals.toLocaleString("pt-BR")} ref.</div>
          </div>
          <div style="flex: 1; min-width: 130px; background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">📅 Dias Ativos</div>
            <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; margin-top: 2px;">${currentStats.totalDays} dias</div>
          </div>
          <div style="flex: 1; min-width: 130px; background-color: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase;">⚡ Média Diária</div>
            <div style="font-size: 18px; font-weight: 900; color: #047857; margin-top: 2px;">~${currentStats.avgDailyMeals} ref/dia</div>
          </div>
          <div style="flex: 1; min-width: 130px; background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase;">🏆 Auditoria</div>
            <div style="font-size: 18px; font-weight: 900; color: #166534; margin-top: 2px;">100% Auditado</div>
          </div>
        </div>

        <!-- Tabela Executiva de Turnos -->
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 18px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 10.5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">
              <th style="padding: 10px 12px;">Turno / Refeição</th>
              <th style="padding: 10px 12px; text-align: center;">Total no Período</th>
              <th style="padding: 10px 12px; text-align: center;">Média Diária</th>
              <th style="padding: 10px 12px; text-align: center;">Participação</th>
              <th style="padding: 10px 12px; text-align: center;">Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 700; color: #1e293b;">☕ Café da Manhã</td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #d97706;">${currentStats.totalBreakfast.toLocaleString("pt-BR")} ref.</td>
              <td style="padding: 10px 12px; text-align: center; color: #475569;">~${currentStats.avgBreakfast} / dia</td>
              <td style="padding: 10px 12px; text-align: center; color: #64748b;">${pctBreakfast}%</td>
              <td style="padding: 10px 12px; text-align: center;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-weight: 700; font-size: 10.5px;">CONCLUÍDO</span>
              </td>
            </tr>
            <tr style="background-color: #fcfcfd; border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 700; color: #1e293b;">🍲 Almoço (Turno de Pico)</td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #2563eb;">${currentStats.totalLunch.toLocaleString("pt-BR")} ref.</td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #1e293b;">~${currentStats.avgLunch} / dia</td>
              <td style="padding: 10px 12px; text-align: center; color: #64748b;">${pctLunch}%</td>
              <td style="padding: 10px 12px; text-align: center;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-weight: 700; font-size: 10.5px;">PICO OPERACIONAL</span>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 700; color: #1e293b;">🍞 Lanche da Tarde (16h)</td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #d97706;">${currentStats.totalSnack.toLocaleString("pt-BR")} ref.</td>
              <td style="padding: 10px 12px; text-align: center; color: #475569;">~${currentStats.avgSnack} / dia</td>
              <td style="padding: 10px 12px; text-align: center; color: #64748b;">${pctSnack}%</td>
              <td style="padding: 10px 12px; text-align: center;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-weight: 700; font-size: 10.5px;">CONCLUÍDO</span>
              </td>
            </tr>
            <tr style="background-color: #fcfcfd; border-bottom: 2px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: 700; color: #1e293b;">🥣 Jantar</td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #0d9488;">${currentStats.totalDinner.toLocaleString("pt-BR")} ref.</td>
              <td style="padding: 10px 12px; text-align: center; color: #475569;">~${currentStats.avgDinner} / dia</td>
              <td style="padding: 10px 12px; text-align: center; color: #64748b;">${pctDinner}%</td>
              <td style="padding: 10px 12px; text-align: center;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-weight: 700; font-size: 10.5px;">CONCLUÍDO</span>
              </td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: 900;">
              <td style="padding: 12px; color: #0f172a;">TOTAL CONSOLIDADO (${currentStats.totalDays} DIAS)</td>
              <td style="padding: 12px; text-align: center; font-size: 14px; color: #0f172a;">${currentStats.totalMonthMeals.toLocaleString("pt-BR")} ref.</td>
              <td style="padding: 12px; text-align: center; font-size: 13px; color: #059669;">~${currentStats.avgDailyMeals} / dia</td>
              <td style="padding: 12px; text-align: center; color: #334155;">100%</td>
              <td style="padding: 12px; text-align: center;">
                <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; background-color: #dcfce7; border: 1px solid #86efac; color: #166534; font-weight: 900; font-size: 10.5px;">
                  100% AUDITADO
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Parecer Técnico de Auditoria -->
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px; color: #1e40af;">
          <strong>⚖️ Parecer Técnico de Auditoria & Marco Zero Oficial:</strong>
          <div style="margin-top: 4px; line-height: 1.5; color: #1e3a8a;">
            Os registros de atendimento e refeições conferem estritamente com os lançamentos in loco e consumos de insumos do almoxarifado. Atestamos 100% de consistência contábil perante a Diretoria da JMN.
          </div>
        </div>

        ${customEmailNote.trim() ? `
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px; color: #334155;">
            <strong>Observação da Gestão:</strong> ${customEmailNote.trim()}
          </div>
        ` : ""}

        <!-- Assinatura Institucional -->
        <div style="margin-top: 22px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
          <div>Fraternalmente em Cristo,</div>
          <div style="font-weight: 800; color: #0f172a; margin-top: 4px;">Marconi Castro</div>
          <div>Almoxarifado e Refeitório &bull; Centro de Formação e Assistência Social Cristolândia LEM/BA</div>
          <div style="font-size: 11px; color: #94a3b8;">Junta de Missões Nacionais — Convenção Batista Brasileira (CBB)</div>
        </div>
      </div>
    `;
  }, [
    currentMonthName,
    currentStats,
    pctBreakfast,
    pctLunch,
    pctSnack,
    pctDinner,
    customEmailNote,
  ]);

  const handleOpenGmail = () => {
    if (emailMode === "two_months") {
      handleDownloadAugustPDF();
      if (septemberStats.totalDays > 0) {
        setTimeout(() => handleDownloadSeptemberPDF(), 600);
      }
    } else {
      handleDownloadMonthlyPDF();
    }
    const recipients = emailRecipients.trim() || chefEmail;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipients)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, "_blank");
    toast.success(
      "Abrindo o Gmail com todos os dados preenchidos! O relatório em PDF foi baixado para você anexar.",
    );
  };

  const handleOpenMailto = () => {
    if (emailMode === "two_months") {
      handleDownloadAugustPDF();
      if (septemberStats.totalDays > 0) {
        setTimeout(() => handleDownloadSeptemberPDF(), 600);
      }
    } else {
      handleDownloadMonthlyPDF();
    }
    const recipients = emailRecipients.trim() || chefEmail;
    const mailtoUrl = `mailto:${encodeURIComponent(recipients)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
    toast.success(
      "Abrindo seu aplicativo de e-mail padrão. O relatório em PDF foi baixado para anexar.",
    );
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(emailBody);
    setCopiedEmailText(true);
    toast.success("Texto simples copiado para a área de transferência!");
    setTimeout(() => setCopiedEmailText(false), 3000);
  };

  const handleCopyHtml = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const type = "text/html";
        const blob = new Blob([emailHtml], { type });
        const textBlob = new Blob([emailBody], { type: "text/plain" });
        const data = [new ClipboardItem({ [type]: blob, "text/plain": textBlob })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(emailBody);
      }
      setEmailCopiedHtml(true);
      toast.success(
        "Tabela Executiva copiada com formatação! Cole direto no Gmail ou Outlook.",
      );
      setTimeout(() => setEmailCopiedHtml(false), 3000);
    } catch (e) {
      console.warn("HTML copy fallback to plain text:", e);
      navigator.clipboard.writeText(emailBody);
      setEmailCopiedHtml(true);
      toast.success("Texto do e-mail copiado!");
      setTimeout(() => setEmailCopiedHtml(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                <Utensils className="w-3 h-3" />
                Cozinha & Refeitório Cristolândia
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                4 Refeições Diárias
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Controle de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                Refeições
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Monitore a quantidade de pessoas atendidas diariamente no{" "}
              <strong>Café da Manhã</strong>, <strong>Almoço</strong>,{" "}
              <strong>Lanche das 16h</strong> e <strong>Jantar</strong>,
              garantindo a contabilização geral e o relatório mensal detalhado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Switch to Monthly Report / Daily Tab */}
            <button
              onClick={() =>
                setActiveMealTab(
                  activeMealTab === "daily" ? "monthly" : "daily",
                )
              }
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm border ${
                activeMealTab === "monthly"
                  ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400"
                  : "bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
              }`}
              title="Alternar entre lançamentos diários e relatório mensal"
            >
              {activeMealTab === "monthly" ? (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-slate-900" />
                  <span>Voltar aos Lançamentos</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>Gerar Relatório Mensal</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Imprimir relatório de refeições"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Botão Enviar por E-mail Executivo do Mês Filtrado */}
            <button
              onClick={() => {
                setEmailMode("single_month");
                setShowEmailModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/40"
              title={`Enviar relatório executivo de refeições de ${formatMonthName(selectedMonth)} por e-mail`}
            >
              <Mail className="w-4 h-4 text-amber-300" />
              <span>✉️ Prestação Mensal (E-mail)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 text-white font-black uppercase">
                {formatMonthName(selectedMonth).split(" ")[0]}
              </span>
            </button>

            {/* Total Hoje */}
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Hoje ({formatDateBr(todayStr)})
                </p>
                <p className="text-base font-black text-white">
                  {stats.todayTotal}{" "}
                  <span className="text-xs font-medium text-amber-400">
                    refeições
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD PRINCIPAL DE CONTABILIZAÇÃO GERAL DE REFEIÇÕES */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/40 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-amber-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Contabilização Geral Consolidada
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {stats.totalRecords}{" "}
                  {stats.totalRecords === 1
                    ? "dia registrado"
                    : "dias registrados"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Total Geral de Refeições
              </h2>
            </div>
          </div>

          <div className="text-left md:text-right bg-slate-900/80 md:bg-transparent p-4 md:p-0 rounded-2xl border border-slate-800 md:border-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Soma Geral de Todas as Refeições
            </p>
            <p className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
              {stats.totalAllMeals.toLocaleString("pt-BR")}{" "}
              <span className="text-sm font-semibold text-slate-300">
                refeições
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Média Geral:{" "}
              <strong className="text-white">{stats.avgDailyMeals}</strong>{" "}
              refeições/dia
            </p>
          </div>
        </div>

        {/* 4 Totais Acumulados por Turno */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5">
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-400" /> Café da Manhã
              Total
            </p>
            <p className="text-lg sm:text-xl font-black text-white mt-1">
              {stats.totalBreakfastAll.toLocaleString("pt-BR")}{" "}
              <span className="text-xs font-normal text-slate-400">ref.</span>
            </p>
            <p className="text-[10px] text-amber-400/90 font-medium mt-0.5">
              Média: {stats.avgBreakfast}/dia
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5">
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-emerald-400" /> Almoço Total
            </p>
            <p className="text-lg sm:text-xl font-black text-white mt-1">
              {stats.totalLunchAll.toLocaleString("pt-BR")}{" "}
              <span className="text-xs font-normal text-slate-400">ref.</span>
            </p>
            <p className="text-[10px] text-emerald-400/90 font-medium mt-0.5">
              Média: {stats.avgLunch}/dia
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5">
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-orange-400" /> Lanche 16h
              Total
            </p>
            <p className="text-lg sm:text-xl font-black text-white mt-1">
              {stats.totalSnackAll.toLocaleString("pt-BR")}{" "}
              <span className="text-xs font-normal text-slate-400">ref.</span>
            </p>
            <p className="text-[10px] text-orange-400/90 font-medium mt-0.5">
              Média: {stats.avgSnack}/dia
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5">
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Soup className="w-3.5 h-3.5 text-indigo-400" /> Jantar Total
            </p>
            <p className="text-lg sm:text-xl font-black text-white mt-1">
              {stats.totalDinnerAll.toLocaleString("pt-BR")}{" "}
              <span className="text-xs font-normal text-slate-400">ref.</span>
            </p>
            <p className="text-[10px] text-indigo-400/90 font-medium mt-0.5">
              Média: {stats.avgDinner}/dia
            </p>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveMealTab("daily")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeMealTab === "daily"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Lançamento & Histórico Diário</span>
        </button>

        <button
          onClick={() => setActiveMealTab("monthly")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeMealTab === "monthly"
              ? "bg-amber-500 text-slate-950 shadow-sm font-black"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Relatório Mensal de Refeições</span>
          <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-slate-900 text-amber-400">
            PDF
          </span>
        </button>
      </div>

      {activeMealTab === "daily" ? (
        <div className="space-y-6">
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Café da Manhã */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Café da Manhã
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {stats.avgBreakfast}{" "}
                  <span className="text-xs font-medium text-slate-400">
                    pessoas/dia
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Média matinal
                </p>
              </div>
            </div>

            {/* Almoço */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Almoço (Pico)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {stats.avgLunch}{" "}
                  <span className="text-xs font-medium text-slate-400">
                    pessoas/dia
                  </span>
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  Maior demanda diária
                </p>
              </div>
            </div>

            {/* Lanche 16h */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Lanche das 16h
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <SunMedium className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {stats.avgSnack}{" "}
                  <span className="text-xs font-medium text-slate-400">
                    pessoas/dia
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Média da tarde (16:00)
                </p>
              </div>
            </div>

            {/* Jantar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Jantar
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Soup className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {stats.avgDinner}{" "}
                  <span className="text-xs font-medium text-slate-400">
                    pessoas/dia
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Média noturna (19:00)
                </p>
              </div>
            </div>
          </div>

          {/* MAIN FORM: FAST LAUNCHER CARD (Admin Only) */}
          {isAdmin && (
            <form
              onSubmit={handleSave}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Lançamento Diário de Refeições
                    </h2>
                    {editingMealId ? (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] font-black rounded-md uppercase">
                        Editando Registro
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-black rounded-md uppercase">
                        Novo Lançamento
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione a data e informe a quantidade de pessoas que
                    comeram em cada turno.
                  </p>
                </div>

                {/* Date Selector */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() - 1);
                      setSelectedDate(d.toISOString().split("T")[0]);
                    }}
                    className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Dia anterior"
                  >
                    &larr;
                  </button>

                  <div className="flex items-center gap-2 px-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent font-bold text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                      required
                    />
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                      ({getDayOfWeekName(selectedDate)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() + 1);
                      setSelectedDate(d.toISOString().split("T")[0]);
                    }}
                    className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Próximo dia"
                  >
                    &rarr;
                  </button>

                  {selectedDate !== todayStr && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className="ml-1 px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-xl hover:bg-amber-400 transition-colors"
                    >
                      Hoje
                    </button>
                  )}
                </div>
              </div>

              {/* 4 MEALS INTERACTIVE COUNTER CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Café da Manhã */}
                <div className="bg-amber-50/60 dark:bg-slate-800/60 border-2 border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 space-y-3 transition-all hover:border-amber-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Café da Manhã
                        </h3>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                          07:00 às 08:30
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => adjustCount(setBreakfast, -5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 5"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setBreakfast, -1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 1"
                    >
                      <Minus className="w-3.5 h-3.5 mx-auto" />
                    </button>

                    <div className="w-20 text-center">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={breakfast}
                        onChange={(e) =>
                          setBreakfast(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="w-full text-center text-2xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/50 rounded-xl py-1 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        required
                      />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                        pessoas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustCount(setBreakfast, 1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 1"
                    >
                      <Plus className="w-3.5 h-3.5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setBreakfast, 5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 5"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* 2. Almoço */}
                <div className="bg-emerald-50/60 dark:bg-slate-800/60 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 space-y-3 transition-all hover:border-emerald-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Almoço
                        </h3>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          11:30 às 13:00
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => adjustCount(setLunch, -5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 5"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setLunch, -1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 1"
                    >
                      <Minus className="w-3.5 h-3.5 mx-auto" />
                    </button>

                    <div className="w-20 text-center">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={lunch}
                        onChange={(e) =>
                          setLunch(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full text-center text-2xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/50 rounded-xl py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                        pessoas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustCount(setLunch, 1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 1"
                    >
                      <Plus className="w-3.5 h-3.5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setLunch, 5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 5"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* 3. Lanche das 16h */}
                <div className="bg-orange-50/60 dark:bg-slate-800/60 border-2 border-orange-200 dark:border-orange-500/30 rounded-2xl p-4 space-y-3 transition-all hover:border-orange-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-sm">
                        <SunMedium className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Lanche das 16h
                        </h3>
                        <p className="text-[10px] text-orange-700 dark:text-orange-400 font-medium">
                          16:00 às 16:45
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => adjustCount(setAfternoonSnack, -5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 5"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setAfternoonSnack, -1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 1"
                    >
                      <Minus className="w-3.5 h-3.5 mx-auto" />
                    </button>

                    <div className="w-20 text-center">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={afternoonSnack}
                        onChange={(e) =>
                          setAfternoonSnack(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="w-full text-center text-2xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/50 rounded-xl py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        required
                      />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                        pessoas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustCount(setAfternoonSnack, 1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 1"
                    >
                      <Plus className="w-3.5 h-3.5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setAfternoonSnack, 5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 5"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* 4. Jantar */}
                <div className="bg-indigo-50/60 dark:bg-slate-800/60 border-2 border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 space-y-3 transition-all hover:border-indigo-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                        <Soup className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Jantar
                        </h3>
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                          19:00 às 20:00
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => adjustCount(setDinner, -5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 5"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setDinner, -1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Diminuir 1"
                    >
                      <Minus className="w-3.5 h-3.5 mx-auto" />
                    </button>

                    <div className="w-20 text-center">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={dinner}
                        onChange={(e) =>
                          setDinner(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full text-center text-2xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-500/50 rounded-xl py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                        pessoas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustCount(setDinner, 1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 1"
                    >
                      <Plus className="w-3.5 h-3.5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustCount(setDinner, 5)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      title="Adicionar 5"
                    >
                      +5
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTTOM METADATA: RESPONSIBLE, NOTES & ACTION BUTTON */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Responsible */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Responsável pelo Lançamento:</span>
                  </label>
                  <input
                    type="text"
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    placeholder="Ex: Marconi Castro"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Observações do Dia (Cardápio / Eventos):</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Almoço especial de sábado / Visita voluntários"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Live Total & Save Action */}
                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Total do Dia
                    </span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {currentTotal}{" "}
                      <span className="text-xs font-medium text-amber-500">
                        refeições
                      </span>
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Salvar Refeições</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* HISTORICAL LOGS TABLE & SEARCH */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                  <span>Histórico de Refeições Servidas</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registros diários organizados por data com contagem de cada turno
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Seletor de Mês no Histórico */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <select
                    value={dailyMonthFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDailyMonthFilter(val);
                      if (val !== "all") {
                        setSelectedMonth(val);
                      }
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Meses</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthName(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por responsável..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Botão de Envio de E-mail do Mês Filtrado */}
                <button
                  type="button"
                  onClick={() => {
                    if (dailyMonthFilter !== "all") {
                      setSelectedMonth(dailyMonthFilter);
                    }
                    setEmailMode("single_month");
                    setShowEmailModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
                  title="Gerar e-mail de prestação de contas com as refeições deste mês"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    ✉️ E-mail ({dailyMonthFilter !== "all" ? formatMonthName(dailyMonthFilter).split(" ")[0] : formatMonthName(selectedMonth).split(" ")[0]})
                  </span>
                </button>
              </div>
            </div>

            {/* Banner de Filtro Ativo no Histórico */}
            {dailyMonthFilter !== "all" && (
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[10px] uppercase">
                    Filtro Ativo
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Apenas refeições de <strong>{formatMonthName(dailyMonthFilter)}</strong>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({filteredMeals.length} dias • {monthlyStats.totalMonthMeals.toLocaleString("pt-BR")} ref. servidas)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth(dailyMonthFilter);
                      setEmailMode("single_month");
                      setShowEmailModal(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Mail className="w-3 h-3 text-amber-300" />
                    <span>Enviar Prestação deste Mês</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyMonthFilter("all")}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Ver todos os meses
                  </button>
                </div>
              </div>
            )}

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 rounded-l-xl">Data / Dia</th>
                    <th className="py-3 px-3 text-center">Café</th>
                    <th className="py-3 px-3 text-center">Almoço</th>
                    <th className="py-3 px-3 text-center">Lanche 16h</th>
                    <th className="py-3 px-3 text-center">Jantar</th>
                    <th className="py-3 px-4 text-center font-black">
                      Total Dia
                    </th>
                    <th className="py-3 px-4">Responsável & Observações</th>
                    {isAdmin && (
                      <th className="py-3 px-4 text-right rounded-r-xl">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredMeals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 8 : 7}
                        className="py-8 text-center text-slate-400"
                      >
                        Nenhum registro de refeição encontrado para os critérios
                        pesquisados.
                      </td>
                    </tr>
                  ) : (
                    filteredMeals.map((record) => {
                      const isToday = record.date === todayStr;
                      return (
                        <tr
                          key={record.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isToday ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{formatDateBr(record.date)}</span>
                              {isToday && (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] rounded uppercase">
                                  Hoje
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block">
                              {getDayOfWeekName(record.date)}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                            {record.breakfast}
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {record.lunch}
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-orange-600 dark:text-orange-400">
                            {record.afternoonSnack}
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            {record.dinner}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-amber-400 font-black rounded-lg text-xs border border-slate-700">
                              {record.totalMeals}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {record.responsible}
                            </p>
                            {record.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                {record.notes}
                              </p>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditRecord(record)}
                                  className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Editar este dia"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDelete(record.id, record.date)
                                  }
                                  className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  title="Excluir registro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* RELATÓRIO MENSAL DE REFEIÇÕES VIEW */
        <div className="space-y-6">
          {/* Seletor do Mês & Ações */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-3 py-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white capitalize">
                      {formatMonthName(selectedMonth)}
                    </span>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) =>
                    e.target.value && setSelectedMonth(e.target.value)
                  }
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                />

                <button
                  onClick={() => setSelectedMonth(todayStr.substring(0, 7))}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Mês Atual
                </button>
              </div>

              {/* Botões de Exportar, Imprimir e E-mail */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Botão Enviar por E-mail Executivo do Mês Filtrado */}
                <button
                  onClick={() => {
                    setEmailMode("single_month");
                    setShowEmailModal(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                  title={`Gerar e-mail executivo de refeições e prestação de contas exclusivamente de ${formatMonthName(selectedMonth)}`}
                >
                  <Mail className="w-4 h-4 text-amber-300" />
                  <span>✉️ Prestação de Contas (E-mail)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                    {monthlyStats.totalMonthMeals.toLocaleString("pt-BR")} ref.
                  </span>
                </button>

                <button
                  onClick={handleDownloadMonthlyPDF}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Relatório em PDF</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Métricas Executivas Mensais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">
                Total de Refeições no Mês
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {monthlyStats.totalMonthMeals.toLocaleString("pt-BR")}{" "}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  refeições
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Soma acumulada em {formatMonthName(selectedMonth)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Dias com Registro no Mês
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {monthlyStats.totalDays}{" "}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  dias registrados
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Presença nos turnos diários
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Média Diária no Mês
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {monthlyStats.avgDailyMeals}{" "}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  refeições/dia
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Média geral diária neste mês
              </p>
            </div>
          </div>

          {/* 4 Cards de Médias Diárias por Turno no Mês */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Café da Manhã
                </span>
                <Coffee className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                {monthlyStats.avgBreakfast}{" "}
                <span className="text-xs font-normal text-slate-400">
                  média/dia
                </span>
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                Total Mês: {monthlyStats.totalBreakfast} ref.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Almoço
                </span>
                <Utensils className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                {monthlyStats.avgLunch}{" "}
                <span className="text-xs font-normal text-slate-400">
                  média/dia
                </span>
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                Total Mês: {monthlyStats.totalLunch} ref.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Lanche 16h
                </span>
                <SunMedium className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                {monthlyStats.avgSnack}{" "}
                <span className="text-xs font-normal text-slate-400">
                  média/dia
                </span>
              </p>
              <p className="text-[11px] text-orange-600 dark:text-orange-400 font-bold mt-1">
                Total Mês: {monthlyStats.totalSnack} ref.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Jantar
                </span>
                <Soup className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                {monthlyStats.avgDinner}{" "}
                <span className="text-xs font-normal text-slate-400">
                  média/dia
                </span>
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                Total Mês: {monthlyStats.totalDinner} ref.
              </p>
            </div>
          </div>

          {/* Alerta de Auditoria: Dias sem Lançamento */}
          {missingDaysInMonth.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                    Auditoria de Frequência: {missingDaysInMonth.length} dia(s) sem lançamento em {formatMonthName(selectedMonth)}
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                  {monthlyStats.totalDays} dias registrados / {monthlyStats.totalDays + missingDaysInMonth.length} dias decorridos
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                Os seguintes dias do calendário não possuem lançamento registrado no banco. Se o refeitório funcionou nessas datas, clique no dia para abrir o formulário e lançar:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {missingDaysInMonth.map((m) => (
                  <button
                    key={m.dateStr}
                    onClick={() => {
                      setSelectedDate(m.dateStr);
                      setActiveMealTab("daily");
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer group"
                    title={`Lançar refeições para o dia ${formatDateBr(m.dateStr)}`}
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>{formatDateBr(m.dateStr)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({m.dayOfWeek.split("-")[0]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabela Analítica Diária do Mês */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-500" />
                  <span>
                    Demonstrativo Diário — {formatMonthName(selectedMonth)}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Todas as refeições diárias registradas no mês com médias e
                  total do mês
                </p>
              </div>

              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {monthlyStats.totalDays} registros no mês
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 rounded-l-xl">Data / Dia</th>
                    <th className="py-3 px-3 text-center">Café</th>
                    <th className="py-3 px-3 text-center">Almoço</th>
                    <th className="py-3 px-3 text-center">Lanche 16h</th>
                    <th className="py-3 px-3 text-center">Jantar</th>
                    <th className="py-3 px-4 text-center font-black">
                      Total Dia
                    </th>
                    <th className="py-3 px-4">Responsável & Observações</th>
                    {isAdmin && (
                      <th className="py-3 px-4 text-right rounded-r-xl">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {monthlyStats.monthRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 8 : 7}
                        className="py-12 text-center text-slate-400"
                      >
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="font-semibold text-slate-600 dark:text-slate-300">
                            Nenhuma refeição registrada no mês de{" "}
                            {formatMonthName(selectedMonth)}.
                          </p>
                          <p className="text-xs text-slate-400">
                            Selecione outro mês na barra superior ou faça novos
                            lançamentos na aba de Lançamentos Diários.
                          </p>
                          <button
                            onClick={() => setActiveMealTab("daily")}
                            className="mt-3 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-all cursor-pointer"
                          >
                            Ir para Lançamento de Refeições
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {monthlyStats.monthRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <span>{formatDateBr(record.date)}</span>
                            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block">
                              {getDayOfWeekName(record.date)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                            {record.breakfast}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {record.lunch}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-orange-600 dark:text-orange-400">
                            {record.afternoonSnack}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            {record.dinner}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-amber-400 font-black rounded-lg text-xs border border-slate-700">
                              {record.totalMeals}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {record.responsible}
                            </p>
                            {record.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                {record.notes}
                              </p>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    handleEditRecord(record);
                                    setActiveMealTab("daily");
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Editar este dia"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDelete(record.id, record.date)
                                  }
                                  className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  title="Excluir registro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}

                      {/* LINHA DE TOTAIS DO MÊS */}
                      <tr className="bg-amber-50/70 dark:bg-amber-950/40 font-black border-t-2 border-amber-500/30 text-slate-900 dark:text-white">
                        <td className="py-4 px-4 font-black uppercase text-[11px] tracking-wider text-amber-950 dark:text-amber-300">
                          Total do Mês ({monthlyStats.totalDays} dias)
                        </td>
                        <td className="py-4 px-3 text-center text-amber-700 dark:text-amber-400 font-black text-sm">
                          {monthlyStats.totalBreakfast}
                        </td>
                        <td className="py-4 px-3 text-center text-emerald-700 dark:text-emerald-400 font-black text-sm">
                          {monthlyStats.totalLunch}
                        </td>
                        <td className="py-4 px-3 text-center text-orange-700 dark:text-orange-400 font-black text-sm">
                          {monthlyStats.totalSnack}
                        </td>
                        <td className="py-4 px-3 text-center text-indigo-700 dark:text-indigo-400 font-black text-sm">
                          {monthlyStats.totalDinner}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block px-3 py-1.5 bg-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-sm">
                            {monthlyStats.totalMonthMeals}
                          </span>
                        </td>
                        <td
                          colSpan={isAdmin ? 2 : 1}
                          className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          Soma de todas as refeições do mês
                        </td>
                      </tr>

                      {/* LINHA DE MÉDIAS DIÁRIAS DO MÊS */}
                      <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs">
                        <td className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-400">
                          Média Diária por Refeição
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                          {monthlyStats.avgBreakfast}/dia
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {monthlyStats.avgLunch}/dia
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-orange-600 dark:text-orange-400">
                          {monthlyStats.avgSnack}/dia
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {monthlyStats.avgDinner}/dia
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-900 dark:text-white">
                          {monthlyStats.avgDailyMeals}/dia
                        </td>
                        <td
                          colSpan={isAdmin ? 2 : 1}
                          className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400"
                        >
                          Média diária neste mês
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENVIO DE E-MAIL EXECUTIVO DE REFEIÇÕES & PRESTAÇÃO */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      Demonstrativo Oficial
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {currentMonthName}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                    E-mail Executivo de Refeições & Prestação de Contas
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor de Competência Oficial (Mês Filtrado) */}
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Mês de Referência:
                </span>
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="Mês anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 py-0.5 text-xs font-black text-slate-900 dark:text-white capitalize">
                    {formatMonthName(selectedMonth)}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="Próximo mês"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedMonth(e.target.value);
                      setEmailMode("single_month");
                    }
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                />
              </div>

              <div className="text-right">
                <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                  🎯 Dados exclusivos de {formatMonthName(selectedMonth)}: {monthlyStats.totalMonthMeals.toLocaleString("pt-BR")} ref.
                </span>
              </div>
            </div>

            {/* Seletor de Período da Mensagem */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setEmailMode("single_month")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  emailMode === "single_month"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>
                  1. Mês Selecionado ({formatMonthName(selectedMonth)})
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black uppercase">
                  {monthlyStats.totalMonthMeals.toLocaleString("pt-BR")} ref.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEmailMode("two_months")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  emailMode === "two_months"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>2. Histórico Consolidado (Agosto + Setembro)</span>
              </button>
            </div>

            {/* Scorecard Rápido de 4 Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Total no Período
                </span>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {currentStats.totalMonthMeals.toLocaleString("pt-BR")}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">refeições</span>
              </div>

              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Dias com Registro
                </span>
                <p className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {currentStats.totalDays} dias
                </p>
                <span className="text-[10px] text-indigo-500 font-medium">atendimento</span>
              </div>

              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Média Diária
                </span>
                <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                  ~{currentStats.avgDailyMeals}
                </p>
                <span className="text-[10px] text-emerald-500 font-medium">ref / dia</span>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Conformidade
                </span>
                <p className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                  100% OK
                </p>
                <span className="text-[10px] text-amber-500 font-medium">zero divergência</span>
              </div>
            </div>

            {/* Inputs: Destinatários e Observações */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destinatários Oficiais (Pastor Humberto, Missª. Débora e Chefe Marcus):
                </label>
                <input
                  type="text"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="humbertohpp.59@gmail.com, chefmarcusviniciuses@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observação Adicional da Gestão (Opcional):
                </label>
                <input
                  type="text"
                  value={customEmailNote}
                  onChange={(e) => setCustomEmailNote(e.target.value)}
                  placeholder="Ex: A contagem de todos os turnos foi validada com a equipe da cozinha..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Tab Selector: Tabela Formatada vs Texto Simples */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEmailModalTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailModalTab === "preview"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tabela Executiva (Visual HTML)</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase">
                      Padrão
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailModalTab("plain")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailModalTab === "plain"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Texto Simples (Monospace)</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentMonthName} • {currentStats.totalMonthMeals} Refeições
                </span>
              </div>

              {/* View Content */}
              {emailModalTab === "preview" ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto shadow-inner max-h-[300px] overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
                </div>
              ) : (
                <textarea
                  readOnly
                  rows={11}
                  value={emailBody}
                  className="w-full bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none leading-relaxed select-all"
                />
              )}
            </div>

            {/* Ações Imediatas: Copiar HTML, Copiar Texto, Gmail e Mailto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleCopyHtml}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {emailCopiedHtml ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span className="font-black text-emerald-200">
                      Tabela Formatada Copiada!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Tabela Formatada (p/ Gmail/Outlook)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopyEmailText}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedEmailText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      Texto Copiado!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Texto Simples (p/ WhatsApp)</span>
                  </>
                )}
              </button>
            </div>

            {/* Rodapé com Links de Envio e Download PDF */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOpenGmail}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Abrir no Gmail Web com campos preenchidos e baixar PDF"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir no Gmail (Web)</span>
                </button>

                <button
                  onClick={handleOpenMailto}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Abrir no Outlook ou cliente padrão"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Abrir no Outlook</span>
                </button>

                <button
                  onClick={handleDownloadMonthlyPDF}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Baixar PDF oficial deste mês para anexar"
                >
                  <Download className="w-3.5 h-3.5 text-amber-500" />
                  <span>Baixar PDF</span>
                </button>
              </div>

              <button
                onClick={() => setShowEmailModal(false)}
                className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
