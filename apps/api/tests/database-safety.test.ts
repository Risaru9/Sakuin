import { describe, expect, it } from "vitest";
import { assertSafeTestDatabase } from "./helpers/database-safety.js";

describe("Database safety guard", () => {
  it("mengizinkan database test jika target eksplisit test dan bukan production ref", () => {
    expect(() =>
      assertSafeTestDatabase({
        databaseUrl:
          "postgresql://postgres.testuser:testpass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
        directUrl:
          "postgresql://postgres.testuser:testpass@db.testprojectref.supabase.co:5432/postgres?sslmode=require",
        databaseTarget: "test",
        nodeEnv: "test",
        vercelEnv: "preview",
        productionDatabaseProjectRef: "productionref123"
      })
    ).not.toThrow();
  });

  it("menolak jika DATABASE_URL mengarah ke production project ref", () => {
    expect(() =>
      assertSafeTestDatabase({
        databaseUrl:
          "postgresql://postgres.bwzxtjgrerjimcuyslci:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
        directUrl:
          "postgresql://postgres.testuser:secret@db.testprojectref.supabase.co:5432/postgres?sslmode=require",
        databaseTarget: "test",
        nodeEnv: "test",
        vercelEnv: "preview",
        productionDatabaseProjectRef: "bwzxtjgrerjimcuyslci"
      })
    ).toThrow("forbidden production database project ref");
  });

  it("menolak jika DIRECT_URL mengarah ke production project ref", () => {
    expect(() =>
      assertSafeTestDatabase({
        databaseUrl:
          "postgresql://postgres.testuser:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
        directUrl:
          "postgresql://postgres.bwzxtjgrerjimcuyslci:secret@db.bwzxtjgrerjimcuyslci.supabase.co:5432/postgres?sslmode=require",
        databaseTarget: "test",
        nodeEnv: "test",
        vercelEnv: "preview",
        productionDatabaseProjectRef: "bwzxtjgrerjimcuyslci"
      })
    ).toThrow("forbidden production database project ref");
  });

  it("menolak jika database target belum diset eksplisit", () => {
    expect(() =>
      assertSafeTestDatabase({
        databaseUrl:
          "postgresql://postgres.testuser:testpass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
        directUrl:
          "postgresql://postgres.testuser:testpass@db.testprojectref.supabase.co:5432/postgres?sslmode=require",
        databaseTarget: "",
        nodeEnv: "test",
        vercelEnv: "preview",
        productionDatabaseProjectRef: "productionref123"
      })
    ).toThrow("SAKUIN_DATABASE_TARGET must be explicitly set");
  });

  it("menolak jika runtime environment production", () => {
    expect(() =>
      assertSafeTestDatabase({
        databaseUrl:
          "postgresql://postgres.testuser:testpass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
        directUrl:
          "postgresql://postgres.testuser:testpass@db.testprojectref.supabase.co:5432/postgres?sslmode=require",
        databaseTarget: "test",
        nodeEnv: "production",
        vercelEnv: "production",
        productionDatabaseProjectRef: "productionref123"
      })
    ).toThrow("production runtime environment");
  });
});