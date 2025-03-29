// script.js

// Global variables
let totalAmount = 0, expenseRecords = [], expenseId = 0, editExpenseId = null;
let isDarkTheme = false;

// Load expenses from localStorage when the page loads
if (localStorage.getItem("expenseRecords")) {
    expenseRecords = JSON.parse(localStorage.getItem("expenseRecords"));
    if (expenseRecords.length > 0) {
        expenseId = expenseRecords[expenseRecords.length - 1].id + 1;
        totalAmount = expenseRecords.reduce((sum, exp) => sum + exp.amount, 0);
        document.getElementById('total-amount').innerText = totalAmount.toFixed(2);
        renderExpenseList();
        updateSummary();
    }
}

// Save expenses to localStorage
function saveExpenses() {
    localStorage.setItem("expenseRecords", JSON.stringify(expenseRecords));
}

// New: Helper to return category icon class
function getCategoryIcon(category) {
    switch(category.toLowerCase()){
        case "food":
            return "fa-utensils";
        case "transportation":
            return "fa-bus";
        case "utilities":
            return "fa-lightbulb";
        case "entertainment":
            return "fa-film";
        default:
            return "fa-ellipsis-h";
    }
}

// Render the expenses in the live list
function renderExpenseList() {
    const expenseList = document.getElementById('expenses');
    expenseList.innerHTML = "";
    expenseRecords.forEach(exp => {
        const iconClass = getCategoryIcon(exp.category);
        const li = document.createElement('li');
        li.dataset.id = exp.id;
        li.innerHTML = `
            <div>
                <strong>${exp.description}</strong> - 
                <em><i class="fas ${iconClass}"></i> ${exp.category}</em>
                <span>₹${exp.amount.toFixed(2)}</span>
                <span class="datetime">${exp.formattedDate}</span>
                ${exp.sharedWith ? `<div class="shared-info">Shared with: ${exp.sharedWith} (₹${parseFloat(exp.sharedAmount || 0).toFixed(2)})</div>` : ""}
            </div>
            <div class="action-btns">
                <button class="btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="btn danger delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
        expenseList.appendChild(li);

        // Delete Expense
        li.querySelector('.delete-btn').addEventListener('click', () => {
            expenseRecords = expenseRecords.filter(record => record.id != li.dataset.id);
            totalAmount -= exp.amount;
            document.getElementById('total-amount').innerText = totalAmount.toFixed(2);
            updateSummary();
            saveExpenses();
            renderExpenseList();
            showToast("Expense deleted");
        });
        // Edit Expense
        li.querySelector('.edit-btn').addEventListener('click', () => {
            openEditModal(exp);
        });
    });
}

// Add new expense
document.getElementById('expense-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const description = document.getElementById('description').value,
          amount = parseFloat(document.getElementById('amount').value),
          category = document.getElementById('category').value,
          expenseDateInput = document.getElementById('expense-date').value,
          sharedWith = document.getElementById('shared-with').value,
          sharedAmount = document.getElementById('shared-amount').value;
    if (description && !isNaN(amount) && category && expenseDateInput) {
        addExpense(description, amount, category, expenseDateInput, sharedWith, sharedAmount);
        this.reset();
        showToast("Expense added");
    }
});

// When the category select changes, show/hide the custom category input
document.getElementById('category').addEventListener('change', function() {
    const customCategoryControl = document.querySelector('.custom-category');
    if (this.value === "Other") {
        customCategoryControl.style.display = 'block';
    } else {
        customCategoryControl.style.display = 'none';
    }
});

// Modify addExpense to use custom category if "Other" is selected
function addExpense(description, amount, category, expenseDateInput, sharedWith, sharedAmount) {
    // If user selected "Other", check the custom input field
    if(category === "Other") {
        const customCategory = document.getElementById('custom-category').value.trim();
        if(customCategory !== "") {
            category = customCategory;
        }
    }
    const expenseDate = new Date(expenseDateInput);
    const formattedDate = expenseDate.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    const timestamp = expenseDate.getTime();
    expenseRecords.push({ id: expenseId, description, amount, category, formattedDate, timestamp, sharedWith, sharedAmount });
    expenseId++;
    totalAmount += amount;
    document.getElementById('total-amount').innerText = totalAmount.toFixed(2);
    updateSummary();
    saveExpenses();
    renderExpenseList();
}

// Update category summary
function updateSummary() {
    const summaryList = document.getElementById("summary");
    const summaryData = expenseRecords.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
    }, {});
    summaryList.innerHTML = "";
    for (const category in summaryData) {
        const li = document.createElement('li');
        li.textContent = `${category}: ₹${summaryData[category].toFixed(2)}`;
        summaryList.appendChild(li);
    }
}

// Share list via WhatsApp
document.getElementById("share-summary").addEventListener("click", function() {
    let shareText = "Expense Tracker - All Entries:\n\n";
    expenseRecords.forEach(exp => {
        shareText += `• ${exp.formattedDate}: ${exp.description} (${exp.category}) - ₹${exp.amount.toFixed(2)}`;
        if(exp.sharedWith) {
            shareText += `; Shared with ${exp.sharedWith} (₹${parseFloat(exp.sharedAmount || 0).toFixed(2)})`;
        }
        shareText += "\n";
    });
    shareText += `\nTotal: ₹${totalAmount.toFixed(2)}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank");
});

// Download CSV
document.getElementById("download-csv").addEventListener("click", function() {
    let csvContent = "data:text/csv;charset=utf-8,Description,Category,Amount,Date,Shared With,Shared Amount\n";
    expenseRecords.forEach(exp => {
        csvContent += `"${exp.description}","${exp.category}",${exp.amount.toFixed(2)},"${exp.formattedDate}","${exp.sharedWith || ''}", "${exp.sharedAmount || ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV downloaded");
});

// Expense History filtering
document.getElementById("show-history").addEventListener("click", function() {
    let monthVal = document.getElementById("month-select").value,
        keyword = document.getElementById("keyword").value.toLowerCase(),
        categoryFilter = document.getElementById("category-filter").value,
        allRecords = JSON.parse(localStorage.getItem("expenseRecords")) || [];
    
    if (monthVal !== "") {
        monthVal = parseInt(monthVal);
        allRecords = allRecords.filter(exp => (new Date(exp.timestamp)).getMonth() === monthVal);
    }
    if (keyword) {
        allRecords = allRecords.filter(exp => exp.description.toLowerCase().includes(keyword));
    }
    if (categoryFilter) {
        allRecords = allRecords.filter(exp => exp.category === categoryFilter);
    }
    allRecords.sort((a, b) => a.timestamp - b.timestamp);
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
    allRecords.forEach(exp => {
        const li = document.createElement("li");
        li.textContent = `• ${exp.formattedDate}: ${exp.description} (${exp.category}) - ₹${exp.amount.toFixed(2)}`;
        if(exp.sharedWith) {
            li.textContent += `; Shared with ${exp.sharedWith} (₹${parseFloat(exp.sharedAmount || 0).toFixed(2)})`;
        }
        historyList.appendChild(li);
    });
});

// Clear all expenses
document.getElementById('clear-all').addEventListener('click', function() {
    if(confirm("Are you sure you want to clear all expenses?")) {
        expenseRecords = [];
        totalAmount = 0;
        document.getElementById('total-amount').innerText = "0.00";
        updateSummary();
        saveExpenses();
        renderExpenseList();
        showToast("All expenses cleared");
    }
});

// Edit Modal functionality
const modal = document.getElementById("edit-modal"),
      closeModalBtn = document.getElementById("close-modal");

function openEditModal(expense) {
    editExpenseId = expense.id;
    document.getElementById('edit-description').value = expense.description;
    document.getElementById('edit-amount').value = expense.amount;
    document.getElementById('edit-category').value = expense.category;
    document.getElementById('edit-expense-date').value = new Date(expense.timestamp).toISOString().split("T")[0];
    document.getElementById('edit-shared-with').value = expense.sharedWith || "";
    document.getElementById('edit-shared-amount').value = expense.sharedAmount || "";
    modal.style.display = "flex";
}
closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

// Save edited expense
document.getElementById("edit-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const newDesc = document.getElementById('edit-description').value,
          newAmt = parseFloat(document.getElementById('edit-amount').value),
          newCat = document.getElementById('edit-category').value,
          newDateInput = document.getElementById('edit-expense-date').value,
          newSharedWith = document.getElementById('edit-shared-with').value,
          newSharedAmount = document.getElementById('edit-shared-amount').value;
    expenseRecords = expenseRecords.map(exp => {
        if(exp.id === editExpenseId) {
            totalAmount = totalAmount - exp.amount + newAmt;
            const expenseDate = new Date(newDateInput);
            return { 
              ...exp, 
              description: newDesc, 
              amount: newAmt, 
              category: newCat,
              formattedDate: expenseDate.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
              timestamp: expenseDate.getTime(),
              sharedWith: newSharedWith,
              sharedAmount: newSharedAmount
            };
        }
        return exp;
    });
    document.getElementById('total-amount').innerText = totalAmount.toFixed(2);
    updateSummary();
    saveExpenses();
    renderExpenseList();
    modal.style.display = "none";
    showToast("Expense updated");
});

// Theme toggle functionality
document.getElementById("theme-toggle").addEventListener("click", function() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle("dark", isDarkTheme);
    showToast(isDarkTheme ? "Dark theme enabled" : "Light theme enabled");
});

// Toast notification function
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}
