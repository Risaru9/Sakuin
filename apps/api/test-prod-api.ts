async function testProdApi() {
  const testEmail = `qa+prodtest-${Date.now()}@sakuin.test`;
  const password = "Password123";
  const name = "QA Production Test User";

  console.log(`Registering temporary user: ${testEmail}...`);
  try {
    // 1. Register User in Production
    const regRes = await fetch("https://sakuin-api.vercel.app/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: testEmail, password, name })
    });
    
    const regData = await regRes.json() as any;
    if (!regRes.ok || !regData.success) {
      console.error("Registration failed:", regData);
      return;
    }
    
    const token = regData.data.token;
    console.log("Registration successful! Token received.");

    // 2. Fetch Summary with debug=true in Production
    console.log("Fetching summary from production with debug=true...");
    const sumRes = await fetch("https://sakuin-api.vercel.app/api/summary?debug=true", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const text = await sumRes.text();
    console.log(`Status Code: ${sumRes.status}`);
    try {
      const data = JSON.parse(text);
      console.log(`Response Data:`, JSON.stringify(data, null, 2));
    } catch {
      console.log(`Raw Response Text:`, text);
    }
  } catch (e) {
    console.error("Error running production test:", e);
  }
}

testProdApi();
