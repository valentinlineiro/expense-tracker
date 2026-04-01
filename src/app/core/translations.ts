import type { Language } from './locale-config';

export interface TranslationCatalog {
  offlineBanner: string;
  nav: {
    today: string;
    month: string;
    stats: string;
    settings: string;
  };
  globalBalanceLabel: string;
  errors: {
    loadData: string;
  };
  today: {
    header: string;
    balanceLabel: string;
    emptyTitle: string;
    emptyHintPrefix: string;
    emptyHintOr: string;
    emptyHintSuffix: string;
  };
  month: {
    pull: {
      pulling: string;
      ready: string;
    };
    summary: {
      income: string;
      expense: string;
      balance: string;
    };
    budgetsTitle: string;
    loading: string;
    empty: string;
    zbb: {
      toAssign: string;
      allocated: string;
      fullyBudgeted: string;
      overAllocated: string;
    };
  };
  stats: {
    title: string;
    loading: string;
    noDataTitle: string;
    noDataBodyPrefix: string;
    noDataBodySuffix: string;
    cards: {
      savings: string;
      avgDaily: string;
      mom: string;
    };
    donut: {
      title: string;
      titleMonth: string;
      empty: string;
    };
    trend: {
      title: string;
      expense: string;
      income: string;
    };
    topCategoriesTitle: string;
    topPercentSuffix: string;
    insightsTitle: string;
    insights: {
      moreSpent: string;
      lessSpent: string;
      sameSpent: string;
      topCategory: string;
      savingsHigh: string;
      savingsPositive: string;
      savingsNegative: string;
      projection: string;
    };
    ytd: {
      title: string;
      income: string;
      expense: string;
      net: string;
      rate: string;
    };
    netWorth: {
      title: string;
    };
  };
  transactionModal: {
    editTitle: string;
    newTitle: string;
    typeExpense: string;
    typeIncome: string;
    category: string;
    date: string;
    note: string;
    notePlaceholder: string;
    recurring: string;
    recurringOptions: {
      none: string;
      daily: string;
      weekly: string;
      monthly: string;
    };
    recurringEndDate: string;
    wallet: string;
    save: string;
    saving: string;
    saveChanges: string;
    saveError: string;
  };
  wallets: {
    title: string;
    addWallet: string;
    namePlaceholder: string;
    save: string;
    deleteConfirm: string;
    balance: string;
    manageLink: string;
    empty: string;
    cannotDeleteLast: string;
  };
  settings: {
    title: string;
    currency: string;
    save: string;
    saved: string;
    wallets: string;
    manageWallets: string;
    categories: string;
    newCategory: string;
    namePlaceholder: string;
    typeOptions: {
      expense: string;
      income: string;
      both: string;
    };
    addCategory: string;
    budgets: string;
    budgetsHint: string;
    zbbMode: string;
    zbbModeHint: string;
    splitBtn: string;
    data: string;
    exportCsv: string;
    importCsv: string;
    importSuccess: string;
    exportJson: string;
    importJson: string;
    importJsonSuccess: string;
    language: string;
    languageHint: string;
    dangerZone: string;
    deleteData: string;
    deleteConfirm: string;
    cancel: string;
    confirmDelete: string;
    categoryDeleteConfirm: string;
  };
  transactionCard: {
    delete: string;
    deleteTitle: string;
    confirmDelete: string;
    duplicate: string;
    recurringLabel: {
      daily: string;
      weekly: string;
      monthly: string;
    };
  };
  toast: {
    exportEmpty: string;
    csvEmpty: string;
    csvFormat: string;
    csvReadError: string;
    undoDelete: string;
    undo: string;
    jsonImportError: string;
  };
  search: {
    placeholder: string;
    noResults: string;
    results: string;
  };
  categoryTypes: {
    expense: string;
    income: string;
    both: string;
  };
}

const TRANSLATIONS: Record<Language, TranslationCatalog> = {
  es: {
    offlineBanner: 'Sin conexión — los datos se guardan localmente',
    nav: {
      today: 'Hoy',
      month: 'Mes',
      stats: 'Estadísticas',
      settings: 'Ajustes',
    },
    globalBalanceLabel: 'Saldo total',
    errors: {
      loadData: 'Error al cargar los datos. Recarga la página.',
    },
    today: {
      header: 'Hoy',
      balanceLabel: 'Balance del día',
      emptyTitle: 'Sin movimientos hoy',
      emptyHintPrefix: 'Toca',
      emptyHintOr: 'o pulsa',
      emptyHintSuffix: 'para agregar',
    },
    month: {
      pull: {
        pulling: '↓ Tira para actualizar',
        ready: '↑ Suelta para actualizar',
      },
      summary: {
        income: 'Ingresos',
        expense: 'Gastos',
        balance: 'Balance',
      },
      budgetsTitle: 'Presupuestos',
      loading: 'Cargando...',
      empty: 'Sin movimientos este mes',
      zbb: {
        toAssign: 'Por asignar',
        allocated: '{allocated} asignado de {income} en ingresos',
        fullyBudgeted: '¡Todo asignado!',
        overAllocated: 'Sobre-asignado en {amount}',
      },
    },
    stats: {
      title: 'Estadísticas',
      loading: 'Cargando...',
      noDataTitle: 'Aún no hay datos',
      noDataBodyPrefix: 'Agrega tus primeros gastos e ingresos en la pestaña ',
      noDataBodySuffix: ' para ver estadísticas aquí.',
      cards: {
        savings: 'Ahorro',
        avgDaily: 'Media/día',
        mom: 'vs. anterior',
      },
      donut: {
        title: 'Gastos por categoría — este mes',
        titleMonth: 'Gastos por categoría — {month}',
        empty: 'Sin gastos este mes',
      },
      trend: {
        title: 'Tendencia — 6 meses',
        expense: 'Gastos',
        income: 'Ingresos',
      },
      topCategoriesTitle: 'Top categorías del mes',
      topPercentSuffix: 'del total',
      insightsTitle: 'Perspectivas',
      insights: {
        moreSpent: 'Gastaste un {percent}% más que el mes pasado',
        lessSpent: 'Gastaste un {percent}% menos que el mes pasado',
        sameSpent: 'Gasto idéntico al mes pasado',
        topCategory: 'Mayor categoría: {label} ({percent}% del gasto)',
        savingsHigh: 'Tasa de ahorro del {rate}% — ¡muy bien!',
        savingsPositive: 'Tasa de ahorro del {rate}%',
        savingsNegative: 'Los gastos superan los ingresos en un {rate}%',
        projection: 'Proyección de gasto: {amount} este mes',
      },
      ytd: {
        title: 'Año hasta hoy',
        income: 'Ingresos YTD',
        expense: 'Gastos YTD',
        net: 'Ahorro neto YTD',
        rate: 'Tasa de ahorro YTD',
      },
      netWorth: {
        title: 'Patrimonio neto — histórico',
      },
    },
    settings: {
      title: 'Ajustes',
      currency: 'Moneda',
      save: 'Guardar',
      saved: '✓ Guardado',
      wallets: 'Billeteras',
      manageWallets: 'Gestionar billeteras →',
      categories: 'Categorías',
      newCategory: 'Nueva categoría',
      namePlaceholder: 'Nombre',
      typeOptions: {
        expense: 'Gasto',
        income: 'Ingreso',
        both: 'Ambos',
      },
      addCategory: '+ Agregar',
      budgets: 'Presupuestos mensuales',
      budgetsHint: 'Deja vacío para sin límite. Se muestra como barra de progreso en la vista mensual.',
      zbbMode: 'Presupuesto base cero',
      zbbModeHint: 'Asigna tus ingresos a categorías antes de gastar',
      splitBtn: '🤝 Gastos compartidos',
      data: 'Datos',
      exportCsv: '📤 Exportar a CSV',
      importCsv: '📥 Importar desde CSV',
      importSuccess: '{count} transacciones importadas',
      exportJson: '💾 Exportar copia de seguridad (JSON)',
      importJson: '📂 Importar copia de seguridad (JSON)',
      importJsonSuccess: '{count} registros importados',
      language: 'Idioma',
      languageHint: 'Selecciona el idioma de la app',
      dangerZone: 'Zona peligrosa',
      deleteData: '🗑 Borrar todos los datos',
      deleteConfirm: '¿Estás seguro? Esta acción es irreversible.',
      cancel: 'Cancelar',
      confirmDelete: 'Sí, borrar todo',
      categoryDeleteConfirm: '¿Eliminar categoría \"{name}\"?',
    },
    transactionModal: {
      editTitle: 'Editar transacción',
      newTitle: 'Nueva transacción',
      typeExpense: 'Gasto',
      typeIncome: 'Ingreso',
      category: 'Categoría',
      date: 'Fecha',
      note: 'Nota (opcional)',
      notePlaceholder: 'Descripción...',
      recurring: 'Repetir',
      recurringOptions: {
        none: 'No',
        daily: 'Diario',
        weekly: 'Semanal',
        monthly: 'Mensual',
      },
      recurringEndDate: 'Fecha de fin (opcional)',
      wallet: 'Billetera',
      save: 'Agregar',
      saving: 'Guardando…',
      saveChanges: 'Guardar cambios',
      saveError: 'No se pudo guardar la transacción. Inténtalo de nuevo.',
    },
    wallets: {
      title: 'Billeteras',
      addWallet: '+ Nueva billetera',
      namePlaceholder: 'Nombre (ej. Efectivo)',
      save: 'Guardar',
      deleteConfirm: '¿Eliminar billetera "{name}"?',
      balance: 'Saldo',
      manageLink: 'Gestionar billeteras →',
      empty: 'Sin billeteras',
      cannotDeleteLast: 'No puedes eliminar la última billetera.',
    },
    transactionCard: {
      delete: '🗑 Eliminar',
      deleteTitle: 'Eliminar',
      confirmDelete: '¿Confirmar?',
      duplicate: 'Duplicar',
      recurringLabel: {
        daily: 'Diario',
        weekly: 'Semanal',
        monthly: 'Mensual',
      },
    },
    toast: {
      exportEmpty: 'No hay transacciones para exportar.',
      csvEmpty: 'El CSV está vacío o no tiene datos.',
      csvFormat: 'Formato no reconocido. Exporta primero desde esta app.',
      csvReadError: 'Error al leer el archivo. Comprueba que es un CSV válido.',
      undoDelete: 'Transacción eliminada',
      undo: 'Deshacer',
      jsonImportError: 'Archivo inválido. Asegúrate de que fue exportado desde esta app.',
    },
    search: {
      placeholder: 'Buscar transacciones…',
      noResults: 'Sin resultados para "{query}"',
      results: '{count} resultados',
    },
    categoryTypes: {
      expense: 'Gasto',
      income: 'Ingreso',
      both: 'Ambos',
    },
  },
  en: {
    offlineBanner: 'Offline — data stays on your device',
    nav: {
      today: 'Today',
      month: 'Month',
      stats: 'Stats',
      settings: 'Settings',
    },
    globalBalanceLabel: 'Net balance',
    errors: {
      loadData: 'Failed to load data. Reload the page.',
    },
    today: {
      header: 'Today',
      balanceLabel: 'Day balance',
      emptyTitle: 'No transactions yet',
      emptyHintPrefix: 'Tap',
      emptyHintOr: 'or press',
      emptyHintSuffix: 'to add',
    },
    month: {
      pull: {
        pulling: '↓ Pull to refresh',
        ready: '↑ Release to refresh',
      },
      summary: {
        income: 'Income',
        expense: 'Expenses',
        balance: 'Balance',
      },
      budgetsTitle: 'Budgets',
      loading: 'Loading...',
      empty: 'No activity this month',
      zbb: {
        toAssign: 'To assign',
        allocated: '{allocated} assigned of {income} income',
        fullyBudgeted: 'Fully budgeted!',
        overAllocated: 'Over-allocated by {amount}',
      },
    },
    stats: {
      title: 'Statistics',
      loading: 'Loading...',
      noDataTitle: 'No data yet',
      noDataBodyPrefix: 'Add your first expenses and income on the ',
      noDataBodySuffix: ' tab to see stats here.',
      cards: {
        savings: 'Savings',
        avgDaily: 'Avg/day',
        mom: 'vs prev. month',
      },
      donut: {
        title: 'Expenses by category — this month',
        titleMonth: 'Expenses by category — {month}',
        empty: 'No expenses this month',
      },
      trend: {
        title: 'Trend — 6 months',
        expense: 'Expenses',
        income: 'Income',
      },
      topCategoriesTitle: 'Top categories this month',
      topPercentSuffix: 'of total',
      insightsTitle: 'Insights',
      insights: {
        moreSpent: 'You spent {percent}% more than last month',
        lessSpent: 'You spent {percent}% less than last month',
        sameSpent: 'Spending matches last month',
        topCategory: 'Top category: {label} ({percent}% of spend)',
        savingsHigh: 'Savings rate is {rate}% — great job!',
        savingsPositive: 'Savings rate is {rate}%',
        savingsNegative: 'Expenses exceed income by {rate}%',
        projection: 'Projected spend: {amount} this month',
      },
      ytd: {
        title: 'Year to Date',
        income: 'Income YTD',
        expense: 'Expenses YTD',
        net: 'Net Savings YTD',
        rate: 'Savings Rate YTD',
      },
      netWorth: {
        title: 'Net worth — all time',
      },
    },
    settings: {
      title: 'Settings',
      currency: 'Currency',
      save: 'Save',
      saved: '✓ Saved',
      wallets: 'Wallets',
      manageWallets: 'Manage wallets →',
      categories: 'Categories',
      newCategory: 'New category',
      namePlaceholder: 'Name',
      typeOptions: {
        expense: 'Expense',
        income: 'Income',
        both: 'Both',
      },
      addCategory: '+ Add',
      budgets: 'Monthly budgets',
      budgetsHint: 'Leave empty for no limit. Shows as a progress bar on the month view.',
      zbbMode: 'Zero-based budgeting',
      zbbModeHint: 'Assign your income to categories before spending it',
      splitBtn: '🤝 Shared expenses',
      data: 'Data',
      exportCsv: '📤 Export to CSV',
      importCsv: '📥 Import from CSV',
      importSuccess: 'Imported {count} transactions',
      exportJson: '💾 Export backup (JSON)',
      importJson: '📂 Import backup (JSON)',
      importJsonSuccess: '{count} records imported',
      language: 'Language',
      languageHint: 'Choose your app language',
      dangerZone: 'Danger zone',
      deleteData: '🗑 Delete all data',
      deleteConfirm: 'Are you sure? This action is irreversible.',
      cancel: 'Cancel',
      confirmDelete: 'Yes, delete everything',
      categoryDeleteConfirm: 'Delete category \"{name}\"?',
    },
    transactionModal: {
      editTitle: 'Edit transaction',
      newTitle: 'New transaction',
      typeExpense: 'Expense',
      typeIncome: 'Income',
      category: 'Category',
      date: 'Date',
      note: 'Note (optional)',
      notePlaceholder: 'Description...',
      recurring: 'Repeat',
      recurringOptions: {
        none: 'No',
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
      },
      recurringEndDate: 'End date (optional)',
      wallet: 'Wallet',
      save: 'Add',
      saving: 'Saving…',
      saveChanges: 'Save changes',
      saveError: 'Could not save the transaction. Please try again.',
    },
    wallets: {
      title: 'Wallets',
      addWallet: '+ New wallet',
      namePlaceholder: 'Name (e.g. Cash)',
      save: 'Save',
      deleteConfirm: 'Delete wallet "{name}"?',
      balance: 'Balance',
      manageLink: 'Manage wallets →',
      empty: 'No wallets yet',
      cannotDeleteLast: 'You cannot delete the last wallet.',
    },
    transactionCard: {
      delete: '🗑 Delete',
      deleteTitle: 'Delete',
      confirmDelete: 'Confirm?',
      duplicate: 'Duplicate',
      recurringLabel: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
      },
    },
    toast: {
      exportEmpty: 'There are no transactions to export.',
      csvEmpty: 'The CSV is empty or missing data.',
      csvFormat: 'Format not recognized. Export from this app first.',
      csvReadError: 'Could not read the file. Make sure it is a valid CSV.',
      undoDelete: 'Transaction deleted',
      undo: 'Undo',
      jsonImportError: 'Invalid backup file. Make sure it was exported from this app.',
    },
    search: {
      placeholder: 'Search transactions…',
      noResults: 'No results for "{query}"',
      results: '{count} results',
    },
    categoryTypes: {
      expense: 'Expense',
      income: 'Income',
      both: 'Both',
    },
  },
};

export function getTranslations(lang: Language): TranslationCatalog {
  return TRANSLATIONS[lang];
}
