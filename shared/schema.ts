import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema (Students and Admin)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  referenceNumber: text("reference_number").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  hasVoted: boolean("has_voted").default(false).notNull(),
  schoolLevel: text("school_level"),
  gradeLevel: integer("grade_level"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  referenceNumber: true,
  isAdmin: true,
  schoolLevel: true,
  gradeLevel: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Schools Settings
export const schoolSettings = pgTable("school_settings", {
  id: serial("id").primaryKey(),
  schoolName: text("school_name").notNull(),
  electionTitle: text("election_title").notNull(),
  electionStatus: text("election_status").notNull().default("inactive"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  logo1: text("logo1"),
  logo2: text("logo2"),
});

export const insertSchoolSettingsSchema = createInsertSchema(schoolSettings).pick({
  schoolName: true,
  electionTitle: true,
  electionStatus: true,
  startDate: true,
  endDate: true,
  logo1: true,
  logo2: true,
});

export type InsertSchoolSettings = z.infer<typeof insertSchoolSettingsSchema>;
export type SchoolSettings = typeof schoolSettings.$inferSelect;

// Partylists
export const partylists = pgTable("partylists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  logo: text("logo"),
  platformImage: text("platform_image"),
  groupPhoto: text("group_photo"),
});

export const insertPartylistSchema = createInsertSchema(partylists).pick({
  name: true,
  color: true,
  logo: true,
  platformImage: true,
  groupPhoto: true,
});

export type InsertPartylist = z.infer<typeof insertPartylistSchema>;
export type Partylist = typeof partylists.$inferSelect;

// Positions
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  maxVotes: integer("max_votes").notNull().default(1),
  schoolLevels: jsonb("school_levels").notNull().$type<string[]>(),
  displayOrder: integer("display_order").notNull(),
});

export const insertPositionSchema = createInsertSchema(positions).pick({
  name: true,
  maxVotes: true,
  schoolLevels: true,
  displayOrder: true,
});

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// Candidates
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  photo: text("photo"),
  positionId: integer("position_id").notNull(),
  partylistId: integer("partylist_id").notNull(),
  schoolLevels: jsonb("school_levels").notNull().$type<string[]>(),
  gradeLevels: jsonb("grade_levels").notNull().$type<number[]>(),
});

export const insertCandidateSchema = createInsertSchema(candidates).pick({
  name: true,
  photo: true,
  positionId: true,
  partylistId: true,
  schoolLevels: true,
  gradeLevels: true,
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// Votes
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  candidateId: integer("candidate_id").notNull(),
  positionId: integer("position_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  userId: true,
  candidateId: true,
  positionId: true,
});

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

// Extended schemas for API
export const loginSchema = z.object({
  name: z.string().min(1, "Name is required"),
  referenceNumber: z.string().min(1, "Reference number is required"),
});

export const schoolLevelSelectionSchema = z.object({
  schoolLevel: z.enum(["elementary", "juniorHigh", "seniorHigh"]),
  gradeLevel: z.number().int().min(3).max(12)
});
