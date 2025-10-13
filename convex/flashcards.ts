import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

async function isAdmin(ctx: any, userId: string) {
  const adminRecord = await ctx.db
    .query("admins")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  return !!adminRecord;
}

// Get all flashcard sets assigned to the current user
export const getAssignedSets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    
    const assignments = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const setsWithProgress = await Promise.all(
      assignments.map(async (assignment) => {
        const set = await ctx.db.get(assignment.setId);
        if (!set) return null;
        
        const totalCards = await ctx.db
          .query("flashcards")
          .withIndex("by_set", (q) => q.eq("setId", assignment.setId))
          .collect();
        
        const progress = await ctx.db
          .query("userProgress")
          .withIndex("by_user_and_set", (q) => 
            q.eq("userId", userId).eq("setId", assignment.setId)
          )
          .collect();
        
        // Calculate stats per card using n+1 rule
        const cardStats = new Map<string, { correct: number; incorrect: number; isMastered: boolean }>();
        
        for (const p of progress) {
          const cardId = p.cardId;
          if (!cardStats.has(cardId)) {
            cardStats.set(cardId, { correct: 0, incorrect: 0, isMastered: false });
          }
          const stats = cardStats.get(cardId)!;
          if (p.correct) {
            stats.correct++;
          } else {
            stats.incorrect++;
          }
        }
        
        // A card is mastered if correct >= incorrect + 1
        let masteredCount = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0;
        
        for (const stats of cardStats.values()) {
          totalCorrect += stats.correct;
          totalIncorrect += stats.incorrect;
          if (stats.correct >= stats.incorrect + 1) {
            stats.isMastered = true;
            masteredCount++;
          }
        }
        
        const reviewedCount = cardStats.size;
        
        return {
          _id: set._id,
          name: set.name,
          description: set.description,
          totalCards: totalCards.length,
          reviewedCards: reviewedCount,
          correctCards: totalCorrect,
          incorrectCards: totalIncorrect,
          masteredCards: masteredCount,
          progress: totalCards.length > 0 ? (masteredCount / totalCards.length) * 100 : 0,
        };
      })
    );
    
    return setsWithProgress.filter(s => s !== null);
  },
});

// Get flashcard set information
export const getFlashcardSet = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // Check if user has access to this set
    const assignment = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_user_and_set", (q) => 
        q.eq("userId", userId).eq("setId", args.setId)
      )
      .first();
    
    if (!assignment) {
      throw new Error("You don't have access to this flashcard set");
    }
    
    const set = await ctx.db.get(args.setId);
    return set;
  },
});

// Get flashcards for a specific set
export const getFlashcards = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // Check if user has access to this set
    const assignment = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_user_and_set", (q) => 
        q.eq("userId", userId).eq("setId", args.setId)
      )
      .first();
    
    if (!assignment) {
      throw new Error("You don't have access to this flashcard set");
    }
    
    const cards = await ctx.db
      .query("flashcards")
      .withIndex("by_set", (q) => q.eq("setId", args.setId))
      .collect();
    
    // Get user's progress for each card
    const cardsWithProgress = await Promise.all(
      cards.map(async (card) => {
        const progress = await ctx.db
          .query("userProgress")
          .withIndex("by_user_set_card", (q) => 
            q.eq("userId", userId).eq("setId", args.setId).eq("cardId", card._id)
          )
          .collect();
        
        // Calculate correct and incorrect counts
        const correctCount = progress.filter(p => p.correct).length;
        const incorrectCount = progress.filter(p => !p.correct).length;
        
        // A card is mastered if correct >= incorrect + 1
        const isMastered = correctCount >= incorrectCount + 1;
        
        return {
          ...card,
          hasBeenReviewed: progress.length > 0,
          lastResult: progress.length > 0 ? progress[progress.length - 1].correct : null,
          isMastered,
          correctCount,
          incorrectCount,
        };
      })
    );
    
    return cardsWithProgress.sort((a, b) => a.order - b.order);
  },
});

// Record user's answer for a flashcard
export const recordAnswer = mutation({
  args: {
    setId: v.id("flashcardSets"),
    cardId: v.id("flashcards"),
    correct: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // Verify access
    const assignment = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_user_and_set", (q) => 
        q.eq("userId", userId).eq("setId", args.setId)
      )
      .first();
    
    if (!assignment) {
      throw new Error("You don't have access to this flashcard set");
    }
    
    await ctx.db.insert("userProgress", {
      userId,
      setId: args.setId,
      cardId: args.cardId,
      correct: args.correct,
    });
    
    return null;
  },
});

// Reset user's progress for a flashcard set
export const resetProgress = mutation({
  args: {
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // Verify access
    const assignment = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_user_and_set", (q) => 
        q.eq("userId", userId).eq("setId", args.setId)
      )
      .first();
    
    if (!assignment) {
      throw new Error("You don't have access to this flashcard set");
    }
    
    // Delete all progress records for this user and set
    const progressRecords = await ctx.db
      .query("userProgress")
      .withIndex("by_user_and_set", (q) => 
        q.eq("userId", userId).eq("setId", args.setId)
      )
      .collect();
    
    for (const record of progressRecords) {
      await ctx.db.delete(record._id);
    }
    
    return null;
  },
});

// Admin: Get all flashcard sets
export const getAllSets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    const admin = await isAdmin(ctx, userId);
    
    if (!admin) {
      throw new Error("Admin access required");
    }
    
    const sets = await ctx.db.query("flashcardSets").collect();
    
    const setsWithStats = await Promise.all(
      sets.map(async (set) => {
        const cardCount = await ctx.db
          .query("flashcards")
          .withIndex("by_set", (q) => q.eq("setId", set._id))
          .collect();
        
        const assignmentCount = await ctx.db
          .query("userSetAssignments")
          .withIndex("by_set", (q) => q.eq("setId", set._id))
          .collect();
        
        return {
          ...set,
          cardCount: cardCount.length,
          assignedUsers: assignmentCount.length,
        };
      })
    );
    
    return setsWithStats;
  },
});

// Admin: Get all users
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    const admin = await isAdmin(ctx, userId);
    
    if (!admin) {
      throw new Error("Admin access required");
    }
    
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name,
    }));
  },
});

// Admin: Create flashcard set from CSV data
export const createFlashcardSet = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    cards: v.array(v.object({
      question: v.string(),
      answer: v.string(),
      hint: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const admin = await isAdmin(ctx, userId);
    
    if (!admin) {
      throw new Error("Admin access required");
    }
    
    const setId = await ctx.db.insert("flashcardSets", {
      name: args.name,
      description: args.description,
      createdBy: userId,
    });
    
    for (let i = 0; i < args.cards.length; i++) {
      await ctx.db.insert("flashcards", {
        setId,
        question: args.cards[i].question,
        answer: args.cards[i].answer,
        hint: args.cards[i].hint,
        order: i,
      });
    }
    
    return setId;
  },
});

// Admin: Update flashcard set name and description
export const updateFlashcardSet = mutation({
  args: {
    setId: v.id("flashcardSets"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const admin = await isAdmin(ctx, userId);
    
    if (!admin) {
      throw new Error("Admin access required");
    }
    
    await ctx.db.patch(args.setId, {
      name: args.name,
      description: args.description,
    });
    
    return null;
  },
});

// Admin: Assign set to user
export const assignSetToUser = mutation({
  args: {
    userId: v.id("users"),
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    const adminId = await getLoggedInUser(ctx);
    const admin = await isAdmin(ctx, adminId);
    
    if (!admin) {
      throw new Error("Admin access required");
    }
    
    // Check if already assigned
    const existing = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_user_and_set", (q) => 
        q.eq("userId", args.userId).eq("setId", args.setId)
      )
      .first();
    
    if (existing) {
      throw new Error("Set already assigned to this user");
    }
    
    await ctx.db.insert("userSetAssignments", {
      userId: args.userId,
      setId: args.setId,
      assignedBy: adminId,
    });
    
    return null;
  },
});

// Admin: Remove set assignment
export const removeSetAssignment = mutation({
  args: {
    userId: v.id("users"),
    setId: v.id("flashcardSets"),
  },
  handler: async (ctx, args) => {
    const adminId = await getLoggedInUser(ctx);
    const admin = await isAdmin(ctx, adminId);
    
    if (!admin) {
      throw new Error("Admin access required");
    }
    
    const assignment = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_user_and_set", (q) => 
        q.eq("userId", args.userId).eq("setId", args.setId)
      )
      .first();
    
    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
    
    return null;
  },
});

// Check if current user is admin
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    return await isAdmin(ctx, userId);
  },
});

// Admin: Get user assignments for a set
export const getSetAssignments = query({
  args: { setId: v.id("flashcardSets") },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const admin = await isAdmin(ctx, userId);
    
    if (!admin) {
      throw new Error("Admin access required");
    }
    
    const assignments = await ctx.db
      .query("userSetAssignments")
      .withIndex("by_set", (q) => q.eq("setId", args.setId))
      .collect();
    
    const usersWithAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const user = await ctx.db.get(assignment.userId);
        return {
          userId: assignment.userId,
          email: user?.email,
          name: user?.name,
        };
      })
    );
    
    return usersWithAssignments;
  },
});
