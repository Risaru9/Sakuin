// Test script untuk debug summary endpoint
const API_BASE_URL = "http://127.0.0.1:5000";

async function testSummary() {
  console.log("=== TESTING SUMMARY ENDPOINT ===\n");
  
  // Step 1: Register test user
  console.log("1. Registering test user...");
  const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Test User Debug",
      email: `test-debug-${Date.now()}@example.com`,
      password: "password123"
    })
  });
  
  const registerData = await registerResponse.json();
  console.log("Register status:", registerResponse.status);
  console.log("Register response:", JSON.stringify(registerData, null, 2));
  
  if (!registerData.success) {
    console.error("Registration failed!");
    return;
  }
  
  const token = registerData.data.token;
  console.log("\nToken:", token);
  
  // Step 2: Call summary endpoint
  console.log("\n2. Calling summary endpoint...");
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
  console.log("\nSummary raw response:");
  console.log(summaryText);
  
  try {
    const summaryData = JSON.parse(summaryText);
    console.log("\nSummary parsed response:");
    console.log(JSON.stringify(summaryData, null, 2));
  } catch (e) {
    console.error("\nFailed to parse summary response as JSON");
    console.error("Error:", e.message);
  }
}

testSummary().catch(error => {
  console.error("\n=== ERROR ===");
  console.error(error);
});
