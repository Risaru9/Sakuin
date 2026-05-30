// Test script untuk debug summary dengan data transaksi
const API_BASE_URL = "http://127.0.0.1:5000";

async function testSummaryWithData() {
  console.log("=== TESTING SUMMARY WITH TRANSACTION DATA ===\n");
  
  // Step 1: Register test user
  console.log("1. Registering test user...");
  const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Test User With Data",
      email: `test-data-${Date.now()}@example.com`,
      password: "password123"
    })
  });
  
  const registerData = await registerResponse.json();
  if (!registerData.success) {
    console.error("Registration failed!");
    return;
  }
  
  const token = registerData.data.token;
  const userId = registerData.data.user.id;
  console.log("User registered:", userId);
  
  // Step 2: Get categories
  console.log("\n2. Getting categories...");
  const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  
  const categoriesData = await categoriesResponse.json();
  if (!categoriesData.success || categoriesData.data.length === 0) {
    console.error("Failed to get categories!");
    return;
  }
  
  const expenseCategory = categoriesData.data.find(c => c.type === "EXPENSE");
  const incomeCategory = categoriesData.data.find(c => c.type === "INCOME");
  
  console.log("Expense category:", expenseCategory.name);
  console.log("Income category:", incomeCategory.name);
  
  // Step 3: Create transactions
  console.log("\n3. Creating transactions...");
  
  // Create income transaction
  const incomeResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      categoryId: incomeCategory.id,
      type: "INCOME",
      amount: 5000000,
      note: "Gaji bulanan",
      date: new Date().toISOString()
    })
  });
  
  const incomeData = await incomeResponse.json();
  console.log("Income transaction created:", incomeData.success);
  
  // Create expense transaction
  const expenseResponse = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      categoryId: expenseCategory.id,
      type: "EXPENSE",
      amount: 50000,
      note: "Makan siang",
      date: new Date().toISOString()
    })
  });
  
  const expenseData = await expenseResponse.json();
  console.log("Expense transaction created:", expenseData.success);
  
  // Step 4: Call summary endpoint
  console.log("\n4. Calling summary endpoint...");
  const summaryResponse = await fetch(`${API_BASE_URL}/api/summary`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  
  console.log("Summary status:", summaryResponse.status);
  
  if (summaryResponse.status !== 200) {
    const errorText = await summaryResponse.text();
    console.error("\n=== ERROR RESPONSE ===");
    console.error(errorText);
    return;
  }
  
  const summaryData = await summaryResponse.json();
  console.log("\n=== SUMMARY SUCCESS ===");
  console.log("Total Income:", summaryData.data.totalIncome);
  console.log("Total Expense:", summaryData.data.totalExpense);
  console.log("Balance:", summaryData.data.balance);
  console.log("Transaction Count:", summaryData.data.transactionCount);
  console.log("Safe to Spend Status:", summaryData.data.safeToSpend.status);
  console.log("Financial Checkup Status:", summaryData.data.financialCheckup.status);
  console.log("Habit Status:", summaryData.data.habit?.habitStatus);
}

testSummaryWithData().catch(error => {
  console.error("\n=== ERROR ===");
  console.error(error);
});
