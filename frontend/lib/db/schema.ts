import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const extractedData = pgTable("extracted_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  extractedContent: jsonb("extractedContent")
    .notNull()
    .$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExtractedData = typeof extractedData.$inferSelect;
export type NewExtractedData = typeof extractedData.$inferInsert;
