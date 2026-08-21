import { integer, primaryKey, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name"), timezone: text("timezone").notNull().default("Asia/Shanghai"), ...timestamps,
}, t => [uniqueIndex("idx_users_email").on(t.email)]);

export const directories = sqliteTable("directories", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(()=>users.id), parentId: text("parent_id"), name: text("name").notNull(), sortOrder: integer("sort_order").notNull().default(0), ...timestamps,
}, t => [index("idx_directories_user_parent").on(t.userId,t.parentId)]);

export const tags = sqliteTable("tags", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), name:text("name").notNull(), normalizedName:text("normalized_name").notNull().default(""), ...timestamps,
}, t => [uniqueIndex("idx_tags_user_normalized_name").on(t.userId,t.normalizedName)]);

export const sourceAssets = sqliteTable("source_assets", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), storageKey:text("storage_key").notNull(), originalName:text("original_name").notNull(), mimeType:text("mime_type").notNull(), size:integer("size").notNull(), width:integer("width"), height:integer("height"), checksum:text("checksum"), status:text("status",{enum:["uploading","ready","failed"]}).notNull(), ...timestamps,
}, t => [index("idx_assets_user_created").on(t.userId,t.createdAt)]);

export const parseTasks = sqliteTable("parse_tasks", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), sourceAssetId:text("source_asset_id").notNull().references(()=>sourceAssets.id), mode:text("mode",{enum:["memorization","question"]}).notNull(), status:text("status",{enum:["queued","running","review_required","completed","partial_failed","failed"]}).notNull(), totalItems:integer("total_items").notNull().default(0), completedItems:integer("completed_items").notNull().default(0), failedItems:integer("failed_items").notNull().default(0), pipelineVersion:text("pipeline_version").notNull(), errorCode:text("error_code"), startedAt:integer("started_at",{mode:"timestamp"}), finishedAt:integer("finished_at",{mode:"timestamp"}), ...timestamps,
}, t => [index("idx_parse_tasks_user_status").on(t.userId,t.status)]);

export const parseItems = sqliteTable("parse_items", {
  id:text("id").primaryKey(), parseTaskId:text("parse_task_id").notNull().references(()=>parseTasks.id), itemType:text("item_type",{enum:["memorization","question"]}).notNull(), orderIndex:integer("order_index").notNull(), status:text("status",{enum:["queued","running","review_required","completed","failed"]}).notNull(), retryCount:integer("retry_count").notNull().default(0), rawOutput:text("raw_output"), validatedOutput:text("validated_output"), errorMessage:text("error_message"), ...timestamps,
}, t => [uniqueIndex("idx_parse_items_task_order").on(t.parseTaskId,t.orderIndex)]);

export const questions = sqliteTable("questions", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), sourceAssetId:text("source_asset_id").notNull().references(()=>sourceAssets.id), parseItemId:text("parse_item_id").notNull().references(()=>parseItems.id), questionNumber:text("question_number"), stem:text("stem").notNull(), questionType:text("question_type").notNull(), imageRegion:text("image_region"), difficulty:integer("difficulty"), reviewStatus:text("review_status",{enum:["pending","confirmed","rejected"]}).notNull(), userEdited:integer("user_edited",{mode:"boolean"}).notNull().default(false), ...timestamps,
});

export const questionSolutions = sqliteTable("question_solutions", {
  id:text("id").primaryKey(), questionId:text("question_id").notNull().references(()=>questions.id), answer:text("answer").notNull(), solution:text("solution").notNull(), version:integer("version").notNull(), isCurrent:integer("is_current",{mode:"boolean"}).notNull(), generatedBy:text("generated_by").notNull(), reviewStatus:text("review_status",{enum:["pending","confirmed","rejected"]}).notNull(), createdAt:integer("created_at",{mode:"timestamp"}).notNull(),
}, t => [uniqueIndex("idx_solutions_question_version").on(t.questionId,t.version)]);

export const learningCards = sqliteTable("learning_cards", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), cardType:text("card_type",{enum:["question","knowledge","thinking_model","memorization"]}).notNull(), front:text("front").notNull(), back:text("back").notNull(), explanation:text("explanation"), sourceAssetId:text("source_asset_id").references(()=>sourceAssets.id), directoryId:text("directory_id").references(()=>directories.id), status:text("status",{enum:["active","archived"]}).notNull().default("active"), archivedAt:integer("archived_at",{mode:"timestamp"}), ...timestamps,
}, t => [index("idx_cards_user_status_created").on(t.userId,t.status,t.createdAt),index("idx_cards_source_asset").on(t.sourceAssetId)]);

export const cardGenerationBatches = sqliteTable("card_generation_batches", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), generationKey:text("generation_key").notNull(), status:text("status",{enum:["pending","completed"]}).notNull(), responseJson:text("response_json"), createdAt:integer("created_at",{mode:"timestamp"}).notNull(), updatedAt:integer("updated_at",{mode:"timestamp"}).notNull(),
}, t => [uniqueIndex("idx_card_generation_user_key").on(t.userId,t.generationKey),index("idx_card_generation_created").on(t.createdAt)]);

export const learningCardTags = sqliteTable("learning_card_tags", {
  learningCardId:text("learning_card_id").notNull().references(()=>learningCards.id), tagId:text("tag_id").notNull().references(()=>tags.id),
}, t => [primaryKey({columns:[t.learningCardId,t.tagId]})]);

export const memoryStates = sqliteTable("memory_states", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), learningCardId:text("learning_card_id").notNull().references(()=>learningCards.id), status:text("status",{enum:["new","learning","reviewing","mastered"]}).notNull(), reviewCount:integer("review_count").notNull().default(0), lapseCount:integer("lapse_count").notNull().default(0), currentIntervalDays:integer("current_interval_days").notNull().default(0), easeFactor:integer("ease_factor").notNull().default(250), lastRating:text("last_rating"), lastReviewAt:integer("last_review_at",{mode:"timestamp"}), nextReviewAt:integer("next_review_at",{mode:"timestamp"}).notNull(), schedulerType:text("scheduler_type").notNull().default("ebbinghaus"), schedulerState:text("scheduler_state"), updatedAt:integer("updated_at",{mode:"timestamp"}).notNull(),
}, t => [uniqueIndex("idx_memory_user_card").on(t.userId,t.learningCardId),index("idx_memory_user_due").on(t.userId,t.nextReviewAt)]);

export const reviewEvents = sqliteTable("review_events", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), learningCardId:text("learning_card_id").notNull().references(()=>learningCards.id), reviewedAt:integer("reviewed_at",{mode:"timestamp"}).notNull(), rating:text("rating",{enum:["again","hard","good","easy"]}).notNull(), previousStatus:text("previous_status").notNull(), nextStatus:text("next_status").notNull(), previousIntervalDays:integer("previous_interval_days").notNull(), nextIntervalDays:integer("next_interval_days").notNull(), previousDueAt:integer("previous_due_at",{mode:"timestamp"}), nextDueAt:integer("next_due_at",{mode:"timestamp"}).notNull(), schedulerType:text("scheduler_type").notNull(), schedulerVersion:text("scheduler_version").notNull(), createdAt:integer("created_at",{mode:"timestamp"}).notNull(),
}, t => [index("idx_reviews_user_reviewed").on(t.userId,t.reviewedAt)]);

export const modelConfigs = sqliteTable("model_configs", {
  id:text("id").primaryKey(), userId:text("user_id").notNull(), provider:text("provider").notNull(), providerLabel:text("provider_label").notNull(), model:text("model").notNull(), baseUrl:text("base_url").notNull(), encryptedApiKey:text("encrypted_api_key").notNull(), keyLast4:text("key_last4").notNull(), enabled:integer("enabled",{mode:"boolean"}).notNull().default(true), isDefault:integer("is_default",{mode:"boolean"}).notNull().default(false), validationStatus:text("validation_status",{enum:["pending","valid","invalid"]}).notNull().default("pending"), validationError:text("validation_error"), lastValidatedAt:integer("last_validated_at",{mode:"timestamp"}), ...timestamps,
}, t => [index("idx_model_configs_user").on(t.userId),index("idx_model_configs_user_default").on(t.userId,t.isDefault)]);

export const learningDiaries = sqliteTable("learning_diaries", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), entryDate:text("entry_date").notNull(), title:text("title").notNull(), content:text("content").notNull(), ...timestamps,
}, t => [index("idx_diaries_user_date").on(t.userId,t.entryDate),index("idx_diaries_user_created").on(t.userId,t.createdAt)]);
