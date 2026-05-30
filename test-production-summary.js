// Test script untuk debug summary di production
const API_BASE_URL = "https://sakuin-api.vercel.app";

async function testProductionSummary() {
  console.log("=== TESTING PRODUCTION SUMMARY ENDPOINT ===\n");
  console.log("API Base URL:", API_BASE_URL);
  
  // Step 1: Test health endpoint
  console.log("\n1. Testing health endpoint...");
  try {
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    console.log("Health status:", healthResponse.status);
    const healthData = await healthResponse.json();
    console.log("Health response:", JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.error("Health check failed:", error.message);
  }
  
  // Step 2: Register test user
  console.log("\n2. Registering test user in production...");
  try {
    const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Test User Production",
        email: `test-prod-${Date.now()}@example.com`,
        password: "password123"
      })
    });
    
    console.log("Register status:", registerResponse.status);
    const registerText = await registerResponse.text();
    console.log("Register response:", registerText);
    
    if (registerResponse.status !== 201) {
      console.error("Registration failed in production!");
      return;
    }
    
    const registerData = JSON.parse(registerText);
    const token = registerData.data.token;
    console.log("\nToken obtained:", token.substring(0, 50) + "...");
    
    // Step 3: Call summary endpoint
    console.log("\n3. Calling summary endpoint in production...");
    const summaryResponse = await fetch(`${API_BASE_URL}/api/summary`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    console.log("Summary status:", summaryResponse.status);
    console.log("Summary headers:", Object.fromEntries(summaryResponse.headers.entries()));
    
    const summaryText = await summaryResponse.text();
    console.log("\nSummary raw response (first 500 chars):");
    console.log(summaryText.substring(0, 500));
    
    if (summaryResponse.status !== 200) {
      console.error("\n=== PRODUCTION ERROR ===");
      console.error("Status:", summaryResponse.status);
      console.error("Response:", summaryText);
      return;
    }
    
    const summaryData = JSON.parse(summaryText);
    console.log("\n=== PRODUCTION SUMMARY SUCCESS ===");
    console.log("Total Income:", summaryData.data.totalIncome);
    console.log("Total Expense:", summaryData.data.totalExpense);
    console.log("Balance:", summaryData.data.balance);
    console.log("Transaction Count:", summaryData.data.transactionCount);
    
  } catch (error) {
    console.error("\n=== ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  }
}

testProductionSummary();
