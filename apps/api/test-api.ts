import { prisma } from "./src/db/prisma.js";
import jwt from "jsonwebtoken";
import { env } from "./src/config/env.js";

async function testApi() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    console.log(`Testing API for user: ${user.email}`);
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '1h' });
    
    try {
      const res = await fetch("http://127.0.0.1:5000/api/summary", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`  API OK for ${user.email}`);
      } else {
        console.error(`  API Error for ${user.email}:`, data);
      }
    } catch (e) {
      console.error(`  Network Error for ${user.email}:`, e);
    }
  }
}
testApi();
