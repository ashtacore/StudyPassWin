import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  flashcardSets: defineTable({
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
  }),
  
  flashcards: defineTable({
    setId: v.id("flashcardSets"),
    question: v.string(),
    answer: v.string(),
    hint: v.optional(v.string()),
    order: v.number(),
  }).index("by_set", ["setId", "order"]),
  
  userSetAssignments: defineTable({
    userId: v.id("users"),
    setId: v.id("flashcardSets"),
    assignedBy: v.id("users"),
  }).index("by_user", ["userId"])
    .index("by_set", ["setId"])
    .index("by_user_and_set", ["userId", "setId"]),
  
  userProgress: defineTable({
    userId: v.id("users"),
    setId: v.id("flashcardSets"),
    cardId: v.id("flashcards"),
    correct: v.boolean(),
  }).index("by_user_and_set", ["userId", "setId"])
    .index("by_user_set_card", ["userId", "setId", "cardId"]),
  
  admins: defineTable({
    userId: v.id("users"),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
