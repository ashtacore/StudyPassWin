import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";

export function Dashboard({ onStartReview }: { onStartReview: (setId: Id<"flashcardSets">) => void }) {
  const assignedSets = useQuery(api.flashcards.getAssignedSets);
  const resetProgress = useMutation(api.flashcards.resetProgress);
  const [resettingSetId, setResettingSetId] = useState<Id<"flashcardSets"> | null>(null);

  const handleResetProgress = async (setId: Id<"flashcardSets">, setName: string) => {
    if (!confirm(`Are you sure you want to reset all progress for "${setName}"? This action cannot be undone.`)) {
      return;
    }

    setResettingSetId(setId);
    try {
      await resetProgress({ setId });
      toast.success("Progress reset successfully!");
    } catch (error) {
      console.error("Error resetting progress:", error);
      toast.error("Failed to reset progress. Please try again.");
    } finally {
      setResettingSetId(null);
    }
  };

  if (assignedSets === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (assignedSets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Flashcard Sets Yet</h2>
          <p className="text-gray-600 dark:text-gray-300">
            You don't have any flashcard sets assigned to you yet. Contact your administrator to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Flashcard Sets</h1>
        <p className="text-gray-600 dark:text-gray-300">Track your progress and continue learning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedSets.map((set) => (
          <div
            key={set._id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{set.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{set.description}</p>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>Progress</span>
                <span>{set.reviewedCards} / {set.totalCards} cards</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${set.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400 font-medium">✓ {set.correctCards}</span>
                <span className="text-gray-400 dark:text-gray-500">|</span>
                <span className="text-gray-600 dark:text-gray-300">{set.totalCards} total</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onStartReview(set._id)}
                className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
              >
                {set.reviewedCards === 0 ? "Start Review" : "Continue Review"}
              </button>
              
              {set.reviewedCards > 0 && (
                <button
                  onClick={() => handleResetProgress(set._id, set.name)}
                  disabled={resettingSetId === set._id}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {resettingSetId === set._id ? "Resetting..." : "Reset Progress"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
