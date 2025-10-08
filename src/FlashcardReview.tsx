import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";

export function FlashcardReview({ 
  setId, 
  onBack 
}: { 
  setId: Id<"flashcardSets">; 
  onBack: () => void;
}) {
  const flashcards = useQuery(api.flashcards.getFlashcards, { setId });
  const recordAnswer = useMutation(api.flashcards.recordAnswer);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (flashcards === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Flashcards</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">This set doesn't have any flashcards yet.</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const isLastCard = currentIndex === flashcards.length - 1;

  const handleAnswer = async (correct: boolean) => {
    setIsSubmitting(true);
    try {
      await recordAnswer({
        setId,
        cardId: currentCard._id,
        correct,
      });
      
      // Don't auto-advance, wait for user to click next
    } catch (error) {
      console.error("Error recording answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!isLastCard) {
      setCurrentIndex(currentIndex + 1);
      setShowHint(false);
      setShowAnswer(false);
    } else {
      onBack();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Card {currentIndex + 1} of {flashcards.length}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 md:p-12">
        <div className="mb-8">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {currentCard.question}
          </h2>

          {currentCard.hint && !showAnswer && (
            <div className="mb-6">
              {!showHint ? (
                <button
                  onClick={() => setShowHint(true)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  💡 Show Hint
                </button>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-300">
                    <span className="font-semibold">Hint:</span> {currentCard.hint}
                  </p>
                </div>
              )}
            </div>
          )}

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium text-lg"
            >
              Reveal Answer
            </button>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <p className="text-lg text-green-900 dark:text-green-300 font-medium mb-2">Answer:</p>
                <p className="text-gray-900 dark:text-white">{currentCard.answer}</p>
              </div>

              <div className="border-t dark:border-gray-700 pt-6">
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">Did you get it right?</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleAnswer(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium disabled:opacity-50"
                  >
                    ✗ Incorrect
                  </button>
                  <button
                    onClick={() => handleAnswer(true)}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-medium disabled:opacity-50"
                  >
                    ✓ Correct
                  </button>
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-6">
                <button
                  onClick={handleNext}
                  className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                >
                  {isLastCard ? "Finish Review" : "Next Card →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
