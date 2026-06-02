import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull(), // ADMIN, MANAGER, COLLAB
});

export const personas = pgTable('personas', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }).notNull(), // The fictional role of the persona
  managerId: integer('manager_id').references(() => users.id).notNull(),
  collaboratorId: integer('collaborator_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const personaVersions = pgTable('persona_versions', {
  id: serial('id').primaryKey(),
  personaId: integer('persona_id').references(() => personas.id).notNull(),
  versionNumber: integer('version_number').notNull(),
  textContent: text('text_content').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // Em rascunho, Normalizado por IA, PENDING_COLLAB, VALIDATED, ADJUSTMENT_REQUESTED
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  managerId: integer('manager_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, PREPARATION, RUNNING, FINISHER_PENDING, CLOSED
  deadline: timestamp('deadline'),
  numberOfCycles: integer('number_of_cycles').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challengePersonas = pgTable('challenge_personas', {
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  personaId: integer('persona_id').references(() => personas.id).notNull(),
});

export const challengeAxes = pgTable('challenge_axes', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // governance, social, well-being, mixed
  description: text('description'),
});

export const cycles = pgTable('cycles', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  cycleNumber: integer('cycle_number').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const evaluations = pgTable('evaluations', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  cycleId: integer('cycle_id').references(() => cycles.id).notNull(),
  personaId: integer('persona_id').references(() => personas.id).notNull(),
  axisId: integer('axis_id').references(() => challengeAxes.id).notNull(),
  managerId: integer('manager_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(), // 1: ruim, 2: regular, 3: neutro, 4: bom, 5: excelente
  observation: text('observation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projectedPersonas = pgTable('projected_personas', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  cycleId: integer('cycle_id').references(() => cycles.id).notNull(),
  personaId: integer('persona_id').references(() => personas.id).notNull(),
  textContent: text('text_content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const collaboratorValidations = pgTable('collaborator_validations', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  cycleId: integer('cycle_id').references(() => cycles.id).notNull(),
  personaId: integer('persona_id').references(() => personas.id).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // ACCEPTED, PARTIAL, REJECTED
  justification: text('justification'),
  alignmentScore: integer('alignment_score'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const finalEvaluations = pgTable('final_evaluations', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  personaId: integer('persona_id').references(() => personas.id).notNull(),
  axisId: integer('axis_id').references(() => challengeAxes.id).notNull(),
  managerId: integer('manager_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(),
  observation: text('observation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const closureReports = pgTable('closure_reports', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  personaId: integer('persona_id').references(() => personas.id).notNull(),
  summaryText: text('summary_text').notNull(),
  collaboratorStatus: varchar('collaborator_status', { length: 50 }).notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gamification = pgTable('gamification', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  earnedAt: timestamp('earned_at').defaultNow()
});
