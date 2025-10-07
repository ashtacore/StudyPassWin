import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export function Dashboard({ onStartReview }: { onStartReview: (setId: Id<"flashcardSets">) => void }) {
  const assignedSets = useQuery(api.flashcards.getAssignedSets);

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
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Flashcard Sets Yet</h2>
          <p className="text-gray-600">
            You don't have any flashcard sets assigned to you yet. Contact your administrator to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Flashcard Sets</h1>
        <p className="text-gray-600">Track your progress and continue learning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedSets.map((set) => (
          <div
            key={set._id}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
          >
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{set.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{set.description}</p>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{set.reviewedCards} / {set.totalCards} cards</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${set.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium">✓ {set.correctCards}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">{set.totalCards} total</span>
              </div>
            </div>

            <button
              onClick={() => onStartReview(set._id)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {set.reviewedCards === 0 ? "Start Review" : "Continue Review"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
