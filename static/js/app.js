/**
 * SpendWise SPA Application Controller
 * Handles state, API client communication, DOM updates, and charting.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const state = {
        currentView: 'dashboard',
        theme: localStorage.getItem('theme') || 'dark',
        filters: {
            search: '',
            category: '',
            sortBy: 'date',
            sortOrder: 'desc'
        },
        deleteExpenseId: null,
        charts: {
            miniCategory: null,
            analyticsCategory: null,
            analyticsTrend: null
        }
    };

    // --- DOM Elements Cache ---
    const elements = {
        appContainer: document.documentElement,
        themeCheckbox: document.getElementById('theme-checkbox'),
        navItems: document.querySelectorAll('.nav-item'),
        contentViews: document.querySelectorAll('.content-view'),
        viewTitle: document.getElementById('view-title'),
        viewSubtitle: document.getElementById('view-subtitle'),
        viewLoader: document.getElementById('view-loader'),
        currentDateBadge: document.getElementById('current-date-badge'),
        
        // Modals
        addExpenseModal: document.getElementById('add-expense-modal'),
        editExpenseModal: document.getElementById('edit-expense-modal'),
        editBudgetModal: document.getElementById('edit-budget-modal'),
        editSavingsModal: document.getElementById('edit-savings-modal'),
        deleteConfirmModal: document.getElementById('delete-confirm-modal'),
        
        // Forms
        addExpenseForm: document.getElementById('add-expense-form'),
        editExpenseForm: document.getElementById('edit-expense-form'),
        editBudgetForm: document.getElementById('edit-budget-form'),
        editSavingsForm: document.getElementById('edit-savings-form'),
        
        // Triggers
        btnAddExpenseTriggers: document.querySelectorAll('.btn-add-expense-trigger'),
        btnCloseModals: document.querySelectorAll('.btn-close-modal, .btn-close-modal-btn'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        
        // Dashboard Stats
        totalExpensesValue: document.getElementById('total-expenses-value'),
        topCategoryValue: document.getElementById('top-category-value'),
        topCategoryPct: document.getElementById('top-category-pct'),
        transactionCountValue: document.getElementById('transaction-count-value'),
        dailyBurnValue: document.getElementById('daily-burn-value'),
        recentExpensesList: document.getElementById('recent-expenses-list'),
        categoryLegend: document.getElementById('category-legend'),

        // Dashboard Widgets
        budgetAmountDisplay: document.getElementById('budget-amount-display'),
        budgetPctDisplay: document.getElementById('budget-pct-display'),
        budgetProgressBar: document.getElementById('budget-progress-bar'),
        budgetMetaDisplay: document.getElementById('budget-meta-display'),
        savingsAmountDisplay: document.getElementById('savings-amount-display'),
        savingsPctDisplay: document.getElementById('savings-pct-display'),
        savingsProgressBar: document.getElementById('savings-progress-bar'),
        savingsMetaDisplay: document.getElementById('savings-meta-display'),
        spendingTrendList: document.getElementById('spending-trend-list'),
        btnEditBudgetTriggers: document.querySelectorAll('.btn-edit-budget-trigger'),
        btnEditSavingsTriggers: document.querySelectorAll('.btn-edit-savings-trigger'),
        
        // History List
        expensesTableBody: document.getElementById('expenses-table-body'),
        expensesEmptyState: document.getElementById('expenses-empty-state'),
        expenseSearchInput: document.getElementById('expense-search'),
        expenseFilterCategory: document.getElementById('expense-filter-category'),
        expenseSortBy: document.getElementById('expense-sort-by'),
        expenseSortOrderBtn: document.getElementById('expense-sort-order-btn'),
        sortOrderIcon: document.getElementById('sort-order-icon'),
        
        // Analytics Benchmarks
        essentialsBar: document.getElementById('essentials-benchmark-bar'),
        essentialsVal: document.getElementById('essentials-benchmark-val'),
        discretionaryBar: document.getElementById('discretionary-benchmark-bar'),
        discretionaryVal: document.getElementById('discretionary-benchmark-val'),
        
        // AI Insights
        insightsContainer: document.getElementById('ai-insights-container'),
        insightsCountBadge: document.getElementById('insights-count'),
        toastContainer: document.getElementById('toast-container')
    };

    // --- Color Palette for Charts (Matches style.css) ---
    const chartColors = {
        Food: '#0ecb81',
        Travel: '#3b82f6',
        Shopping: '#2dbdb6',
        Education: '#3b82f6',
        Entertainment: '#fcd535',
        'College Expenses': '#f0b90b',
        Hostel: '#929aa5',
        Other: '#707a8a'
    };

    const chartTheme = {
        dark: {
            label: '#707a8a',
            grid: 'rgba(43, 49, 57, 0.8)',
            border: '#1e2329'
        },
        light: {
            label: '#707a8a',
            grid: 'rgba(234, 236, 239, 0.9)',
            border: '#ffffff'
        }
    };

    // --- Formatting Utilities ---
    const formatCurrency = (amount, { minimumFractionDigits = 2, maximumFractionDigits = 2 } = {}) => {
        const formatted = Number(amount).toLocaleString('en-IN', { minimumFractionDigits, maximumFractionDigits });
        return `₹${formatted}`;
    };

    const formatDateFriendly = (date) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    const getCurrentMonthKey = () => {
        const d = new Date();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${month}`;
    };

    const getMonthSpending = (monthlySpending, monthKey) => {
        const entry = monthlySpending.find(m => m.month === monthKey);
        return entry ? entry.amount : 0;
    };

    const getTodayDateString = () => {
        const d = new Date();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${month}-${day}`;
    };

    // --- Toast Notifications Helper ---
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-xmark';
        if (type === 'info') icon = 'fa-circle-info';
        
        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Fade out and remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px) scale(0.9)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // --- Loader Overlay Toggle ---
    const showLoader = (show) => {
        if (show) {
            elements.viewLoader.classList.remove('hidden');
            document.getElementById(`view-${state.currentView}`).classList.add('hidden');
        } else {
            elements.viewLoader.classList.add('hidden');
            document.getElementById(`view-${state.currentView}`).classList.remove('hidden');
        }
    };

    // --- Modal Management ---
    const openModal = (modalElement) => {
        modalElement.classList.remove('hidden');
    };

    const closeModal = (modalElement) => {
        modalElement.classList.add('hidden');
    };

    // --- Render Helpers ---

    // Render Recent Transactions items
    const renderRecentTransactions = (transactions) => {
        elements.recentExpensesList.innerHTML = '';
        if (transactions.length === 0) {
            elements.recentExpensesList.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fa-solid fa-ghost d-block mb-2" style="font-size: 1.5rem; opacity: 0.5;"></i>
                    <p>No recent transactions</p>
                </div>
            `;
            return;
        }

        transactions.forEach(t => {
            const dateObj = new Date(t.date_created);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            let catIcon = 'fa-receipt';
            if (t.category === 'Food') catIcon = 'fa-hamburger';
            if (t.category === 'Travel') catIcon = 'fa-bus';
            if (t.category === 'Shopping') catIcon = 'fa-bag-shopping';
            if (t.category === 'Education') catIcon = 'fa-book-open';
            if (t.category === 'Entertainment') catIcon = 'fa-gamepad';
            if (t.category === 'Other') catIcon = 'fa-ellipsis';

            const item = document.createElement('div');
            item.className = `transaction-item category-${t.category}`;
            item.innerHTML = `
                <div class="transaction-left">
                    <div class="category-icon-wrapper">
                        <i class="fa-solid ${catIcon}"></i>
                    </div>
                    <div class="transaction-details">
                        <span class="transaction-title">${t.title}</span>
                        <span class="transaction-meta">${t.category} &bull; ${dateStr}</span>
                    </div>
                </div>
                <div class="transaction-right">
                    <span class="transaction-amount">${formatCurrency(t.amount)}</span>
                </div>
            `;
            elements.recentExpensesList.appendChild(item);
        });
    };

    // Render Mini allocation chart donut
    const renderMiniCategoryChart = (categories, total) => {
        // Destroy existing chart
        if (state.charts.miniCategory) {
            state.charts.miniCategory.destroy();
            state.charts.miniCategory = null;
        }

        const labels = Object.keys(categories);
        const dataVals = labels.map(cat => categories[cat]);
        const backgroundColors = labels.map(cat => chartColors[cat] || chartColors.Other);
        
        // Render Legend elements
        elements.categoryLegend.innerHTML = '';
        labels.forEach(cat => {
            const amt = categories[cat];
            const pct = total > 0 ? (amt / total) * 100 : 0;
            
            if (amt > 0) {
                const legItem = document.createElement('div');
                legItem.className = 'legend-item';
                legItem.innerHTML = `
                    <div class="legend-header">
                        <span class="legend-name">
                            <span class="legend-color" style="background-color: ${chartColors[cat] || chartColors.Other}"></span>
                            ${cat}
                        </span>
                        <span class="legend-amount">${formatCurrency(amt)} (${pct.toFixed(0)}%)</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="background-color: ${chartColors[cat] || chartColors.Other}; width: ${pct}%"></div>
                    </div>
                `;
                elements.categoryLegend.appendChild(legItem);
            }
        });

        if (total === 0) {
            elements.categoryLegend.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <p>No category allocation details available.</p>
                </div>
            `;
            return;
        }

        const ctx = document.getElementById('miniCategoryChart').getContext('2d');
        state.charts.miniCategory = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw || 0;
                                const percent = total > 0 ? (value / total) * 100 : 0;
                                return ` ${context.label}: ${formatCurrency(value)} (${percent.toFixed(1)}%)`;
                            }
                        }
                    }
                },
                cutout: '75%'
            }
        });
    };

    // Render Expense history table
    const renderExpensesTable = (expenses) => {
        elements.expensesTableBody.innerHTML = '';
        
        if (expenses.length === 0) {
            elements.expensesTableBody.closest('.table-responsive').classList.add('hidden');
            elements.expensesEmptyState.classList.remove('hidden');
            return;
        }

        elements.expensesTableBody.closest('.table-responsive').classList.remove('hidden');
        elements.expensesEmptyState.classList.add('hidden');

        expenses.forEach(e => {
            const row = document.createElement('tr');
            const dateObj = new Date(e.date_created);
            const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            
            row.innerHTML = `
                <td><span class="table-title">${e.title}</span></td>
                <td><span class="category-badge badge-${e.category}">${e.category}</span></td>
                <td><span class="text-muted">${formattedDate}</span></td>
                <td class="text-right"><span class="table-amount">${formatCurrency(e.amount)}</span></td>
                <td class="text-center">
                    <div class="table-actions">
                        <button class="action-btn btn-edit" data-id="${e.id}" title="Edit Expense">
                            <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button class="action-btn btn-delete" data-id="${e.id}" title="Delete Expense">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            elements.expensesTableBody.appendChild(row);
        });

        // Set action button handlers dynamically
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                setupEditExpenseModal(id);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                state.deleteExpenseId = btn.getAttribute('data-id');
                openModal(elements.deleteConfirmModal);
            });
        });
    };

    // Render Analytics category distribution
    const renderAnalyticsCategoryChart = (categories, total) => {
        if (state.charts.analyticsCategory) {
            state.charts.analyticsCategory.destroy();
            state.charts.analyticsCategory = null;
        }

        const labels = Object.keys(categories);
        const dataVals = labels.map(cat => categories[cat]);
        const backgroundColors = labels.map(cat => chartColors[cat] || chartColors.Other);

        const ctx = document.getElementById('analyticsCategoryChart').getContext('2d');
        const theme = chartTheme[state.theme] || chartTheme.dark;
        const labelColor = theme.label;
        
        state.charts.analyticsCategory = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: backgroundColors,
                    borderColor: theme.border,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: labelColor,
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw || 0;
                                const percent = total > 0 ? (value / total) * 100 : 0;
                                return ` ${formatCurrency(value)} (${percent.toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
    };

    // Render Analytics trend line chart
    const renderAnalyticsTrendChart = (monthlySpending) => {
        if (state.charts.analyticsTrend) {
            state.charts.analyticsTrend.destroy();
            state.charts.analyticsTrend = null;
        }

        const labels = monthlySpending.map(m => {
            const [year, month] = m.month.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
        
        const dataVals = monthlySpending.map(m => m.amount);
        const theme = chartTheme[state.theme] || chartTheme.dark;
        const gridColor = theme.grid;
        const labelColor = theme.label;

        const ctx = document.getElementById('analyticsTrendChart').getContext('2d');
        
        state.charts.analyticsTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['No Data'],
                datasets: [{
                    label: 'Monthly Spending (₹)',
                    data: dataVals.length ? dataVals : [0],
                    borderColor: '#fcd535',
                    backgroundColor: 'rgba(252, 213, 53, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointBackgroundColor: '#f0b90b',
                    pointBorderColor: '#181a20',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: labelColor }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: labelColor,
                            callback: function(value) {
                                return formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                            }
                        }
                    }
                }
            }
        });
    };

    // Render Monthly Budget widget
    const renderBudgetWidget = (monthlySpending, budget) => {
        const spent = getMonthSpending(monthlySpending, getCurrentMonthKey());
        const pct = budget > 0 ? (spent / budget) * 100 : 0;
        const remaining = budget - spent;
        const whole = { minimumFractionDigits: 0, maximumFractionDigits: 0 };

        elements.budgetAmountDisplay.textContent =
            `${formatCurrency(spent, whole)} / ${formatCurrency(budget, whole)}`;
        elements.budgetPctDisplay.textContent = `${Math.round(pct)}%`;

        const barWidth = Math.min(pct, 100);
        elements.budgetProgressBar.style.width = `${barWidth}%`;
        elements.budgetProgressBar.className = pct > 100
            ? 'progress-bar bg-danger'
            : 'progress-bar bg-emerald';

        if (budget <= 0) {
            elements.budgetMetaDisplay.textContent = 'Set a monthly budget to track spending';
        } else if (remaining >= 0) {
            elements.budgetMetaDisplay.textContent = `${formatCurrency(remaining, whole)} remaining`;
        } else {
            elements.budgetMetaDisplay.textContent = `${formatCurrency(Math.abs(remaining), whole)} over budget`;
        }
    };

    // Render Savings Goal widget
    const renderSavingsWidget = (currentSavings, savingsTarget) => {
        const pct = savingsTarget > 0 ? (currentSavings / savingsTarget) * 100 : 0;
        const remaining = savingsTarget - currentSavings;
        const whole = { minimumFractionDigits: 0, maximumFractionDigits: 0 };

        elements.savingsAmountDisplay.textContent =
            `${formatCurrency(currentSavings, whole)} / ${formatCurrency(savingsTarget, whole)}`;
        elements.savingsPctDisplay.textContent = `${Math.round(pct)}%`;

        const barWidth = Math.min(pct, 100);
        elements.savingsProgressBar.style.width = `${barWidth}%`;

        if (savingsTarget <= 0) {
            elements.savingsMetaDisplay.textContent = 'Set a savings goal to track progress';
        } else if (currentSavings >= savingsTarget) {
            elements.savingsMetaDisplay.textContent = 'Goal achieved!';
        } else {
            elements.savingsMetaDisplay.textContent = `${formatCurrency(remaining, whole)} remaining`;
        }
    };

    // Render Spending Trend widget (recent months with MoM change)
    const renderSpendingTrend = (monthlySpending) => {
        elements.spendingTrendList.innerHTML = '';

        if (!monthlySpending.length) {
            elements.spendingTrendList.innerHTML = `
                <div class="trend-empty-state">
                    <p>No spending data yet.</p>
                </div>
            `;
            return;
        }

        const sorted = [...monthlySpending].sort((a, b) => b.month.localeCompare(a.month));
        const recent = sorted.slice(0, 6);

        recent.forEach((entry, index) => {
            const [year, month] = entry.month.split('-');
            const monthLabel = new Date(year, month - 1).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
            });

            let changeCell = '<span class="trend-col-change trend-change-neutral">—</span>';
            const olderEntry = sorted[index + 1];
            if (olderEntry && olderEntry.amount > 0) {
                const momPct = ((entry.amount - olderEntry.amount) / olderEntry.amount) * 100;
                const isUp = momPct > 0;
                const changeClass = isUp ? 'text-danger' : 'text-emerald';
                const arrow = isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
                changeCell = `<span class="trend-col-change ${changeClass}">
                    <i class="fa-solid ${arrow}"></i> ${Math.abs(momPct).toFixed(1)}%
                </span>`;
            }

            const row = document.createElement('div');
            row.className = 'trend-row';
            row.innerHTML = `
                <span class="trend-col-month">${monthLabel}</span>
                <span class="trend-col-amount">${formatCurrency(entry.amount)}</span>
                ${changeCell}
            `;
            elements.spendingTrendList.appendChild(row);
        });
    };

    // Render Benchmarks section
    const renderDemographicBenchmarks = (categories, total) => {
        const wantsTotal = (categories.Shopping || 0) + (categories.Entertainment || 0);
        const needsTotal = (categories.Food || 0) + (categories.Education || 0) + (categories.Travel || 0);
        
        const needsPct = total > 0 ? (needsTotal / total) * 100 : 0;
        const wantsPct = total > 0 ? (wantsTotal / total) * 100 : 0;

        elements.essentialsBar.style.width = `${needsPct}%`;
        elements.essentialsVal.textContent = `${needsPct.toFixed(1)}% of expenses (Recommended: 50%)`;
        
        elements.discretionaryBar.style.width = `${wantsPct}%`;
        elements.discretionaryVal.textContent = `${wantsPct.toFixed(1)}% of expenses (Recommended: Max 30%)`;
        
        // Dynamically style based on limit bounds
        if (needsPct > 65) {
            elements.essentialsBar.className = 'progress-bar bg-purple';
        } else {
            elements.essentialsBar.className = 'progress-bar bg-emerald';
        }

        if (wantsPct > 35) {
            elements.discretionaryBar.className = 'progress-bar bg-danger';
        } else {
            elements.discretionaryBar.className = 'progress-bar bg-purple';
        }
    };

    // Render AI Insights cards deck
    const renderInsightsList = (insights) => {
        elements.insightsContainer.innerHTML = '';
        
        // Update badge count
        elements.insightsCountBadge.textContent = insights.length;
        if (insights.length === 1 && insights[0].title.includes("Welcome")) {
            elements.insightsCountBadge.textContent = '0';
        }
        
        insights.forEach(item => {
            let icon = 'fa-circle-info';
            if (item.type === 'warning') icon = 'fa-triangle-exclamation';
            if (item.type === 'success') icon = 'fa-face-laugh-beam';
            if (item.type === 'tip') icon = 'fa-lightbulb';
            
            const card = document.createElement('div');
            card.className = `insight-card insight-${item.type}`;
            card.innerHTML = `
                <div class="insight-card-icon">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="insight-card-content">
                    <div class="insight-card-header">
                        <h4>${item.title}</h4>
                        <span class="insight-category-badge">${item.category}</span>
                    </div>
                    <p>${item.description}</p>
                </div>
            `;
            elements.insightsContainer.appendChild(card);
        });
    };

    // --- Core API Data Load Handlers ---

    // Load AI Insights badge count
    const updateInsightsBadge = async () => {
        try {
            const response = await fetch('/api/insights');
            if (response.ok) {
                const insights = await response.json();
                if (insights.length === 1 && insights[0].title.includes("Welcome")) {
                    elements.insightsCountBadge.textContent = '0';
                } else {
                    elements.insightsCountBadge.textContent = insights.length;
                }
            }
        } catch (e) {
            console.error("Failed to fetch insight badge count", e);
        }
    };

    // Load Dashboard View data
    const loadDashboard = async () => {
        showLoader(true);
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) throw new Error('Failed to load dashboard summary.');
            const data = await response.json();
            
            // Populate metric fields
            elements.totalExpensesValue.textContent = formatCurrency(data.total_expenses);
            
            const categories = data.category_totals;
            let topCat = '-';
            let topAmt = 0;
            
            Object.keys(categories).forEach(cat => {
                const amt = categories[cat];
                if (amt > topAmt) {
                    topAmt = amt;
                    topCat = cat;
                }
            });
            
            elements.topCategoryValue.textContent = topCat;
            const topPctVal = data.total_expenses > 0 ? (topAmt / data.total_expenses) * 100 : 0;
            elements.topCategoryPct.textContent = `${topPctVal.toFixed(1)}% of total spending`;
            
            // Fetch precise database total items count
            const expensesListRes = await fetch('/api/expenses');
            const expensesList = await expensesListRes.json();
            elements.transactionCountValue.textContent = expensesList.length;

            if (expensesList.length >= 2) {
                const dates = expensesList.map(e => new Date(e.date_created));
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                const diffTime = Math.abs(maxDate - minDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                const dailyBurn = data.total_expenses / diffDays;
                elements.dailyBurnValue.textContent = formatCurrency(dailyBurn);
            } else {
                elements.dailyBurnValue.textContent = formatCurrency(data.total_expenses);
            }

            renderBudgetWidget(data.monthly_spending, data.budget);
            renderSavingsWidget(data.current_savings, data.savings_target);
            renderSpendingTrend(data.monthly_spending);
            renderRecentTransactions(data.recent_transactions);
            renderMiniCategoryChart(data.category_totals, data.total_expenses);
            updateInsightsBadge();
            
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            showLoader(false);
        }
    };

    // Load History View data
    const loadExpenses = async () => {
        showLoader(true);
        try {
            const params = new URLSearchParams({
                search: state.filters.search,
                category: state.filters.category,
                sort_by: state.filters.sortBy,
                sort_order: state.filters.sortOrder
            });
            
            const response = await fetch(`/api/expenses?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to retrieve expense logs.');
            const expenses = await response.json();
            
            renderExpensesTable(expenses);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            showLoader(false);
        }
    };

    // Load Analytics View data
    const loadAnalytics = async () => {
        showLoader(true);
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) throw new Error('Failed to load analytical metrics.');
            const data = await response.json();

            renderAnalyticsCategoryChart(data.category_totals, data.total_expenses);
            renderAnalyticsTrendChart(data.monthly_spending);
            renderDemographicBenchmarks(data.category_totals, data.total_expenses);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            showLoader(false);
        }
    };

    // Load AI Insights View data
    const loadInsights = async () => {
        showLoader(true);
        try {
            const response = await fetch('/api/insights');
            if (!response.ok) throw new Error('Could not compile financial analysis.');
            const insights = await response.json();
            
            renderInsightsList(insights);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            showLoader(false);
        }
    };

    // Fetch and populate Edit Expense Modal
    const setupEditExpenseModal = async (id) => {
        try {
            const response = await fetch(`/api/expenses`);
            const expenses = await response.json();
            const exp = expenses.find(item => item.id == id);
            
            if (exp) {
                document.getElementById('edit-expense-id').value = exp.id;
                document.getElementById('edit-expense-title').value = exp.title;
                document.getElementById('edit-expense-amount').value = exp.amount;
                document.getElementById('edit-expense-category').value = exp.category;
                document.getElementById('edit-expense-date').value = exp.date_created;
                
                openModal(elements.editExpenseModal);
            } else {
                showToast('Expense details could not be found.', 'error');
            }
        } catch (err) {
            showToast('Error loading expense data.', 'error');
        }
    };

    // --- Theme Control ---
    const applyTheme = (themeName) => {
        elements.appContainer.setAttribute('data-theme', themeName);
        elements.themeCheckbox.checked = (themeName === 'dark');
        localStorage.setItem('theme', themeName);
        
        // Refresh charts on theme switch to ensure readable text/gridlines
        if (state.currentView === 'dashboard') {
            if (state.charts.miniCategory) {
                loadDashboard();
            }
        } else if (state.currentView === 'analytics') {
            if (state.charts.analyticsCategory) {
                loadAnalytics();
            }
        }
    };

    // --- View Navigation ---
    const navigateToView = (viewName) => {
        state.currentView = viewName;
        
        // Update Sidebar styling
        elements.navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle Content Views
        elements.contentViews.forEach(view => {
            if (view.id === `view-${viewName}`) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });

        // Update Header and load view content
        switch (viewName) {
            case 'dashboard':
                elements.viewTitle.textContent = 'Dashboard';
                elements.viewSubtitle.textContent = 'Track, analyze, and optimize your student budget.';
                loadDashboard();
                break;
            case 'expenses':
                elements.viewTitle.textContent = 'Expense History';
                elements.viewSubtitle.textContent = 'Search, sort, filter, and manage your logs.';
                loadExpenses();
                break;
            case 'analytics':
                elements.viewTitle.textContent = 'Analytics';
                elements.viewSubtitle.textContent = 'Visual breakdowns and demographic budget comparisons.';
                loadAnalytics();
                break;
            case 'insights':
                elements.viewTitle.textContent = 'AI Spending Insights';
                elements.viewSubtitle.textContent = 'Tailored heuristic financial recommendations.';
                loadInsights();
                break;
        }
    };

    // --- Setup Listeners ---
    const setupEventListeners = () => {
        // Theme switch slider
        elements.themeCheckbox.addEventListener('change', (e) => {
            applyTheme(e.target.checked ? 'dark' : 'light');
        });

        // Navigation list clicks
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => {
                navigateToView(item.getAttribute('data-view'));
            });
        });

        // Quick page redirect actions
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-view]');
            if (target && !target.classList.contains('nav-item')) {
                const view = target.getAttribute('data-view');
                navigateToView(view);
            }
        });

        // Modals triggers
        elements.btnAddExpenseTriggers.forEach(btn => {
            btn.addEventListener('click', () => {
                if (document.getElementById('expense-date')) {
                    document.getElementById('expense-date').value = getTodayDateString();
                }
                elements.addExpenseForm.reset();
                openModal(elements.addExpenseModal);
            });
        });

        elements.btnCloseModals.forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal(elements.addExpenseModal);
                closeModal(elements.editExpenseModal);
                closeModal(elements.editBudgetModal);
                closeModal(elements.editSavingsModal);
                closeModal(elements.deleteConfirmModal);
            });
        });

        elements.btnEditBudgetTriggers.forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const response = await fetch('/api/settings');
                    if (!response.ok) throw new Error('Failed to load budget settings.');
                    const settings = await response.json();
                    document.getElementById('budget-limit-input').value = settings.budget;
                    openModal(elements.editBudgetModal);
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        elements.btnEditSavingsTriggers.forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const response = await fetch('/api/settings');
                    if (!response.ok) throw new Error('Failed to load savings settings.');
                    const settings = await response.json();
                    document.getElementById('savings-target-input').value = settings.savings_target;
                    document.getElementById('current-savings-input').value = settings.current_savings;
                    openModal(elements.editSavingsModal);
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        elements.editBudgetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const budget = parseFloat(document.getElementById('budget-limit-input').value);

            try {
                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ budget })
                });
                const result = await response.json();

                if (response.ok) {
                    showToast('Monthly budget updated.');
                    closeModal(elements.editBudgetModal);
                    if (state.currentView === 'dashboard') loadDashboard();
                } else {
                    const errors = result.errors ? result.errors.join('\n') : (result.error || 'Failed to save budget.');
                    showToast(errors, 'error');
                }
            } catch (err) {
                showToast('Network error while saving budget.', 'error');
            }
        });

        elements.editSavingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const savings_target = parseFloat(document.getElementById('savings-target-input').value);
            const current_savings = parseFloat(document.getElementById('current-savings-input').value);

            try {
                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ savings_target, current_savings })
                });
                const result = await response.json();

                if (response.ok) {
                    showToast('Savings goal updated.');
                    closeModal(elements.editSavingsModal);
                    if (state.currentView === 'dashboard') loadDashboard();
                } else {
                    const errors = result.errors ? result.errors.join('\n') : (result.error || 'Failed to save savings goal.');
                    showToast(errors, 'error');
                }
            } catch (err) {
                showToast('Network error while saving savings goal.', 'error');
            }
        });

        // Debounced search text inputs
        let searchTimeout;
        elements.expenseSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.filters.search = elements.expenseSearchInput.value.trim();
                loadExpenses();
            }, 300);
        });

        elements.expenseFilterCategory.addEventListener('change', (e) => {
            state.filters.category = e.target.value;
            loadExpenses();
        });

        elements.expenseSortBy.addEventListener('change', (e) => {
            state.filters.sortBy = e.target.value;
            loadExpenses();
        });

        elements.expenseSortOrderBtn.addEventListener('click', () => {
            if (state.filters.sortOrder === 'desc') {
                state.filters.sortOrder = 'asc';
                elements.sortOrderIcon.className = 'fa-solid fa-sort-amount-asc';
            } else {
                state.filters.sortOrder = 'desc';
                elements.sortOrderIcon.className = 'fa-solid fa-sort-amount-desc';
            }
            loadExpenses();
        });

        // Add Expense form submittal
        elements.addExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                title: document.getElementById('expense-title').value,
                amount: parseFloat(document.getElementById('expense-amount').value),
                category: document.getElementById('expense-category').value,
                date_created: document.getElementById('expense-date').value
            };

            try {
                const response = await fetch('/api/expenses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                
                if (response.ok) {
                    showToast(`Added "${payload.title}" successfully.`);
                    closeModal(elements.addExpenseModal);
                    elements.addExpenseForm.reset();
                    navigateToView(state.currentView);
                } else {
                    const errors = result.errors ? result.errors.join('\n') : (result.error || 'Failed to add expense.');
                    showToast(errors, 'error');
                }
            } catch (err) {
                showToast('Network error while saving expense.', 'error');
            }
        });

        // Edit Expense form submittal
        elements.editExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-expense-id').value;
            const payload = {
                title: document.getElementById('edit-expense-title').value,
                amount: parseFloat(document.getElementById('edit-expense-amount').value),
                category: document.getElementById('edit-expense-category').value,
                date_created: document.getElementById('edit-expense-date').value
            };

            try {
                const response = await fetch(`/api/expenses/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                
                if (response.ok) {
                    showToast('Changes saved successfully.');
                    closeModal(elements.editExpenseModal);
                    navigateToView(state.currentView);
                } else {
                    const errors = result.errors ? result.errors.join('\n') : (result.error || 'Failed to save changes.');
                    showToast(errors, 'error');
                }
            } catch (err) {
                showToast('Network error while updating expense.', 'error');
            }
        });

        // Delete confirmation submittal
        elements.confirmDeleteBtn.addEventListener('click', async () => {
            if (!state.deleteExpenseId) return;

            try {
                const response = await fetch(`/api/expenses/${state.deleteExpenseId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showToast('Expense record deleted.');
                    closeModal(elements.deleteConfirmModal);
                    state.deleteExpenseId = null;
                    navigateToView(state.currentView);
                } else {
                    const result = await response.json();
                    showToast(result.error || 'Failed to delete record.', 'error');
                }
            } catch (err) {
                showToast('Network error while deleting item.', 'error');
            }
        });

        // Export data to CSV trigger
        elements.exportCsvBtn.addEventListener('click', () => {
            window.open('/api/expenses/export', '_blank');
            showToast('Exporting expense log as CSV...', 'info');
        });
    };

    // --- Startup Logic ---
    const init = () => {
        // Render current date
        elements.currentDateBadge.textContent = formatDateFriendly(new Date());

        // Setup form date default to today
        if (document.getElementById('expense-date')) {
            document.getElementById('expense-date').value = getTodayDateString();
        }

        // Setup events
        setupEventListeners();

        // Initial theme setting (Skip charts refresh since they aren't loaded yet)
        elements.appContainer.setAttribute('data-theme', state.theme);
        elements.themeCheckbox.checked = (state.theme === 'dark');

        // Launch home view
        navigateToView('dashboard');
    };

    // Execute application startup
    init();
});
