async function testBulkTransaction() {
  const registerUrl = "https://sakuin-api.vercel.app/api/auth/register";
  const bulkUrl = "https://sakuin-api.vercel.app/api/transactions/bulk";
  const uniqueEmail = `bulk-test-${Date.now()}@example.com`;
  
  try {
    // 1. Daftar user baru untuk dapat token
    console.log("Mendaftarkan user...");
    const regRes = await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bulk Test User",
        email: uniqueEmail,
        password: "Password123"
      })
    });
    const regData = await regRes.json();
    if (!regData.success) {
      throw new Error(`Register gagal: ${JSON.stringify(regData)}`);
    }
    const token = regData.data.token;
    console.log("Token diperoleh. Mengirim bulk transaksi...");

    // 2. Kirim bulk transaction (menggunakan kategori default)
    const bulkRes = await fetch(bulkUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        transactions: [
          {
            type: "EXPENSE",
            amount: "15000",
            categoryId: "cat_expense_food",
            date: new Date().toISOString(),
            note: "Makan siang bulk test"
          },
          {
            type: "INCOME",
            amount: "50000",
            categoryId: "cat_income_salary",
            date: new Date().toISOString(),
            note: "Gaji bulk test"
          }
        ]
      })
    });
    
    console.log(`Status Code: ${bulkRes.status}`);
    const bulkData = await bulkRes.json();
    console.log("Response Body:", JSON.stringify(bulkData, null, 2));
  } catch (error) {
    console.error("Error dalam bulk test:", error);
  }
}

testBulkTransaction();
