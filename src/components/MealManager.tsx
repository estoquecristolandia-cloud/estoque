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
  const canManageEmails = Boolean(
    currentUserEmail &&
    currentUserEmail.trim().toLowerCase() === "estoquecristolandia@gmail.com",
  );
  const todayStr = getTodayDateString();
  const [activeMealTab, setActiveMealTab] = useState<"daily" | "monthly">(
    "daily",
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

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

  // State for email to Chefe Marcus Vinicius
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailMode, setEmailMode] = useState<"two_months" | "single_month">(
    "two_months",
  );
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
    if (!searchTerm.trim()) return meals;
    const term = searchTerm.toLowerCase();
    return meals.filter(
      (m) =>
        m.date.includes(term) ||
        m.responsible.toLowerCase().includes(term) ||
        (m.notes && m.notes.toLowerCase().includes(term)),
    );
  }, [meals, searchTerm]);

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

    return {
      totalMonthMeals,
      totalDays,
      totalBreakfast,
      totalLunch,
      totalSnack,
      totalDinner,
      avgDailyMeals,
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

  const emailSubject =
    emailMode === "two_months"
      ? "Relatório de Refeições - Agosto e Setembro/2026 - Cristolândia LEM/BA"
      : `Relatório Mensal de Refeições Servidas - Cristolândia LEM/BA (${formatMonthName(selectedMonth)})`;

  const emailBody = useMemo(() => {
    if (emailMode === "two_months") {
      return `Prezado ${chefName},
Paz do Senhor / Saudações fraternas!

Conforme solicitado, apresentamos o resumo consolidado das refeições servidas na Cristolândia LEM/BA referentes a Agosto e Setembro de 2026:

📅 1. AGOSTO DE 2026:
• Total: ${augustStats.totalMonthMeals.toLocaleString("pt-BR")} refeições (${augustStats.totalDays} dias registrados) | Média: ${augustStats.avgDailyMeals} ref/dia
  - Café da Manhã: ${augustStats.totalBreakfast.toLocaleString("pt-BR")} (méd. ${augustStats.avgBreakfast}/dia)
  - Almoço: ${augustStats.totalLunch.toLocaleString("pt-BR")} (méd. ${augustStats.avgLunch}/dia)
  - Lanche 16h: ${augustStats.totalSnack.toLocaleString("pt-BR")} (méd. ${augustStats.avgSnack}/dia)
  - Jantar: ${augustStats.totalDinner.toLocaleString("pt-BR")} (méd. ${augustStats.avgDinner}/dia)

📅 2. SETEMBRO DE 2026:
• Total: ${septemberStats.totalMonthMeals.toLocaleString("pt-BR")} refeições (${septemberStats.totalDays} dias registrados) | Média: ${septemberStats.avgDailyMeals} ref/dia
  - Café da Manhã: ${septemberStats.totalBreakfast.toLocaleString("pt-BR")} (méd. ${septemberStats.avgBreakfast}/dia)
  - Almoço: ${septemberStats.totalLunch.toLocaleString("pt-BR")} (méd. ${septemberStats.avgLunch}/dia)
  - Lanche 16h: ${septemberStats.totalSnack.toLocaleString("pt-BR")} (méd. ${septemberStats.avgSnack}/dia)
  - Jantar: ${septemberStats.totalDinner.toLocaleString("pt-BR")} (méd. ${septemberStats.avgDinner}/dia)

📊 SOMA TOTAL CONSOLIDADA (AGOSTO + SETEMBRO):
• Soma Total Geral: ${combinedTwoMonthsStats.totalMonthMeals.toLocaleString("pt-BR")} refeições servidas
• Total de Dias Registrados: ${combinedTwoMonthsStats.totalDays} dias
• Média Diária Geral do Período: ${combinedTwoMonthsStats.avgDailyMeals} refeições/dia
  - Café da Manhã Total: ${combinedTwoMonthsStats.totalBreakfast.toLocaleString("pt-BR")} refeições
  - Almoço Total (Pico): ${combinedTwoMonthsStats.totalLunch.toLocaleString("pt-BR")} refeições
  - Lanche 16h Total: ${combinedTwoMonthsStats.totalSnack.toLocaleString("pt-BR")} refeições
  - Jantar Total: ${combinedTwoMonthsStats.totalDinner.toLocaleString("pt-BR")} refeições

📄 RELATÓRIOS EM ANEXO:
Os relatórios analíticos em PDF de Agosto e Setembro seguem anexos a este e-mail. Permanecemos à inteira disposição para qualquer alinhamento!

Fraternalmente em Cristo,

${currentUserDisplayName || "Marconi Castro (Gestor do Estoque)"}
Centro de Formação e Assistência Social Cristolândia — LEM/BA
Junta de Missões Nacionais — Convenção Batista Brasileira (CBB)
E-mail: estoquecristolandia@gmail.com`;
    }

    return `Prezado ${chefName},
Paz do Senhor / Saudações fraternas!

Conforme solicitado, apresento abaixo o demonstrativo consolidado do Relatório Mensal de Refeições Servidas referente ao mês de ${formatMonthName(selectedMonth)}, realizado na cozinha e refeitório do Centro de Formação e Assistência Social Cristolândia (LEM/BA) - Junta de Missões Nacionais (CBB):

📊 RESUMO EXECUTIVO DO MÊS (${formatMonthName(selectedMonth).toUpperCase()}):
• Total Geral de Refeições: ${monthlyStats.totalMonthMeals.toLocaleString("pt-BR")} refeições
• Quantidade de Dias Registrados: ${monthlyStats.totalDays} dias
• Média Geral Diária: ${monthlyStats.avgDailyMeals} refeições/dia

🍽️ MÉDIAS DIÁRIAS E TOTAIS POR TURNO:
• Café da Manhã: ${monthlyStats.avgBreakfast} pessoas/dia (Total: ${monthlyStats.totalBreakfast.toLocaleString("pt-BR")} refeições)
• Almoço (Turno de Pico): ${monthlyStats.avgLunch} pessoas/dia (Total: ${monthlyStats.totalLunch.toLocaleString("pt-BR")} refeições)
• Lanche das 16h: ${monthlyStats.avgSnack} pessoas/dia (Total: ${monthlyStats.totalSnack.toLocaleString("pt-BR")} refeições)
• Jantar: ${monthlyStats.avgDinner} pessoas/dia (Total: ${monthlyStats.totalDinner.toLocaleString("pt-BR")} refeições)

📄 RELATÓRIO EM ANEXO:
O relatório oficial em PDF segue anexo a este e-mail. Permanecemos à inteira disposição!

Fraternalmente em Cristo,

${currentUserDisplayName || "Marconi Castro (Gestor do Estoque)"}
Centro de Formação e Assistência Social Cristolândia — LEM/BA
Junta de Missões Nacionais — Convenção Batista Brasileira (CBB)
E-mail: estoquecristolandia@gmail.com`;
  }, [
    emailMode,
    chefName,
    augustStats,
    septemberStats,
    combinedTwoMonthsStats,
    selectedMonth,
    monthlyStats,
    currentUserDisplayName,
  ]);

  const handleOpenGmail = () => {
    // Generate PDF automatically so it's ready in downloads to attach
    if (emailMode === "two_months") {
      handleDownloadAugustPDF();
      if (septemberStats.totalDays > 0) {
        setTimeout(() => handleDownloadSeptemberPDF(), 600);
      }
    } else {
      handleDownloadMonthlyPDF();
    }
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(chefEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, "_blank");
    toast.success(
      "Abrindo o Gmail com todos os dados preenchidos! Os relatórios em PDF foram baixados para você anexar.",
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
    const mailtoUrl = `mailto:${encodeURIComponent(chefEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
    toast.success(
      "Abrindo seu aplicativo de e-mail padrão. Os relatórios em PDF foram baixados para anexar.",
    );
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(emailBody);
    setCopiedEmailText(true);
    toast.success("Texto do e-mail copiado para a área de transferência!");
    setTimeout(() => setCopiedEmailText(false), 3000);
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

            {/* Botão Enviar por E-mail ao Chefe Marcos (Exclusivo estoquecristolandia@gmail.com) */}
            {canManageEmails && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                title="Enviar dados por e-mail para o Chefe Marcus Vinicius"
              >
                <Mail className="w-4 h-4 text-blue-200" />
                <span>Enviar p/ Chefe Marcos</span>
              </button>
            )}

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
                  ☕ Café da Manhã
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
                  🍛 Almoço (Pico)
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
                  🥪 Lanche das 16h
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
                  🍲 Jantar
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                  <span>Histórico de Refeições Servidas</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registros diários organizados por data com contagem de cada
                  turno
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por data ou responsável..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 rounded-l-xl">Data / Dia</th>
                    <th className="py-3 px-3 text-center">☕ Café</th>
                    <th className="py-3 px-3 text-center">🍛 Almoço</th>
                    <th className="py-3 px-3 text-center">🥪 Lanche 16h</th>
                    <th className="py-3 px-3 text-center">🍲 Jantar</th>
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
                {/* Botão Enviar por E-mail ao Chefe Marcos (Exclusivo estoquecristolandia@gmail.com) */}
                {canManageEmails && (
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                    title="Enviar relatório por e-mail para o Chefe Marcos"
                  >
                    <Mail className="w-4 h-4 text-blue-200" />
                    <span>Enviar p/ Chefe Marcos</span>
                  </button>
                )}

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
                  ☕ Café da Manhã
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
                  🍛 Almoço
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
                  🥪 Lanche 16h
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
                  🍲 Jantar
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
                    <th className="py-3 px-3 text-center">☕ Café</th>
                    <th className="py-3 px-3 text-center">🍛 Almoço</th>
                    <th className="py-3 px-3 text-center">🥪 Lanche 16h</th>
                    <th className="py-3 px-3 text-center">🍲 Jantar</th>
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

      {/* MODAL DE ENVIO DE E-MAIL AO CHEFE MARCOS (Exclusivo estoquecristolandia@gmail.com) */}
      {canManageEmails && showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      Comunicação Oficial
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {emailMode === "two_months"
                        ? "Agosto + Setembro (Consolidado)"
                        : formatMonthName(selectedMonth)}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                    Enviar Relatório ao Chefe Marcos
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

            {/* Seletor de Período da Mensagem */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setEmailMode("two_months")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  emailMode === "two_months"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Agosto + Setembro (Soma Separada & Total)</span>
              </button>
              <button
                type="button"
                onClick={() => setEmailMode("single_month")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  emailMode === "single_month"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  Apenas Mês Selecionado ({formatMonthName(selectedMonth)})
                </span>
              </button>
            </div>

            {/* Mini Resumo Rápido dos Números */}
            {emailMode === "two_months" ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Agosto / 2026
                  </span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {augustStats.totalMonthMeals.toLocaleString("pt-BR")}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {augustStats.totalDays} dias | méd.{" "}
                    {augustStats.avgDailyMeals}/dia
                  </span>
                </div>

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Setembro / 2026
                  </span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {septemberStats.totalMonthMeals.toLocaleString("pt-BR")}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {septemberStats.totalDays} dias | méd.{" "}
                    {septemberStats.avgDailyMeals}/dia
                  </span>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Soma Total
                  </span>
                  <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {combinedTwoMonthsStats.totalMonthMeals.toLocaleString(
                      "pt-BR",
                    )}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Total Acumulado
                  </span>
                </div>
              </div>
            ) : null}

            {/* Cartão de Destinatário Cadastrado */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-500" />
                  Destinatário Cadastrado
                </span>
                <button
                  onClick={() => {
                    setIsEditingChefContact(!isEditingChefContact);
                    setTempChefEmail(chefEmail);
                    setTempChefName(chefName);
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  {isEditingChefContact ? "Cancelar Edição" : "Editar Contato"}
                </button>
              </div>

              {isEditingChefContact ? (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Nome do Destinatário:
                      </label>
                      <input
                        type="text"
                        value={tempChefName}
                        onChange={(e) => setTempChefName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Chefe Marcus Vinícius"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        E-mail:
                      </label>
                      <input
                        type="email"
                        value={tempChefEmail}
                        onChange={(e) => setTempChefEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveChefContact}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Contato</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {chefName}
                    </p>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                      {chefEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/20">
                      Cadastrado no Sistema
                    </span>
                  </div>
                </div>
              )}

              {/* Informação sobre o PDF */}
              <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="text-blue-500 font-bold">ℹ️</span>
                <span>
                  Ao clicar em <strong>Abrir no Gmail</strong> ou{" "}
                  <strong>App de E-mail</strong>, o relatório oficial em PDF é
                  gerado e baixado automaticamente no seu dispositivo para você
                  anexar ao e-mail.
                </span>
              </div>
            </div>

            {/* Botões de Ação Imediata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleOpenGmail}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Rascunho no Gmail (Web)</span>
              </button>

              <button
                onClick={handleOpenMailto}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Abrir no Outlook / App Padrão</span>
              </button>
            </div>

            {/* Visualização e Cópia do Texto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  Texto Formatado do E-mail:
                </span>
                <button
                  onClick={handleCopyEmailText}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedEmailText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Copiado!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Mensagem</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-h-60 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                {emailBody}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadAugustPDF}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Baixar PDF do relatório analítico de Agosto/2026"
                >
                  <Download className="w-3.5 h-3.5 text-amber-500" />
                  <span>PDF Agosto</span>
                </button>

                <button
                  onClick={handleDownloadSeptemberPDF}
                  className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Baixar PDF do relatório analítico de Setembro/2026"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>PDF Setembro</span>
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
