import { readFile } from "node:fs/promises";
import path from "node:path";
import { hash } from "bcryptjs";
import { Pool } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const migration = await readFile(path.join(process.cwd(), "db/init.sql"), "utf8");
    await pool.query(migration);

    const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? "change-me-now";
    if (password.length < 10) throw new Error("ADMIN_PASSWORD must contain at least 10 characters");
    const passwordHash = await hash(password, 12);
    const existing = await pool.query<{ id: string }>(
      `select id from users where role = 'admin' order by created_at limit 1`,
    );
    if (existing.rows[0]) {
      await pool.query(
        `update users set email = $2, password_hash = $3, role = 'admin' where id = $1`,
        [existing.rows[0].id, email, passwordHash],
      );
    } else {
      await pool.query(
        `insert into users(email, password_hash, role) values ($1, $2, 'admin')`,
        [email, passwordHash],
      );
    }
    console.log(`Database ready; admin account is ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
