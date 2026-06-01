async function testFrontend() {
  const url = "https://sakuin-web.vercel.app";
  console.log(`Menghubungi frontend ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status Code: ${res.status}`);
    console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log(`Response Body (first 500 chars):`, text.slice(0, 500));
  } catch (error) {
    console.error("Gagal menghubungi frontend:", error);
  }
}

async function main() {
  await testFrontend();
}

main();
