async function testAiChat() {
  const registerUrl = "https://sakuin-api.vercel.app/api/auth/register";
  const chatUrl = "https://sakuin-api.vercel.app/api/ai/chat";
  const uniqueEmail = `ai-test-${Date.now()}@example.com`;
  
  try {
    console.log("Mendaftarkan user untuk AI test...");
    const regRes = await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "AI Test User",
        email: uniqueEmail,
        password: "Password123"
      })
    });
    const regData = await regRes.json();
    const token = regData.data.token;
    console.log("Token diperoleh. Mengirim pesan ke AI...");

    // Kirim pesan chat ke AI
    const chatRes = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        message: "Halo, siapa kamu? Tolong berikan analisis singkat kondisi keuangan saya."
      })
    });
    
    console.log(`Status Code: ${chatRes.status}`);
    const chatData = await chatRes.json();
    console.log("Response Body:", JSON.stringify(chatData, null, 2));
  } catch (error) {
    console.error("Error dalam AI chat test:", error);
  }
}

testAiChat();
