import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';



import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const videosTable = sqliteTable("videos", {
  id: int("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  path: text("path").notNull(),
  status: text("status", { enum: ["processing", "completed", "error"] }).notNull().default("processing"),
  streams: text("streams").notNull().default("[]"), 
  createdAt: int("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});


export const db = drizzle(process.env.DB_FILE_NAME!,{
  schema: {
    videosTable,
  },
});

export default db;

export type IVideo = typeof videosTable.$inferSelect
