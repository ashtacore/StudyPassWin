import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./Dashboard";
import { AdminPanel } from "./AdminPanel";
import { FlashcardReview } from "./FlashcardReview";
import { DarkModeToggle } from "./DarkModeToggle";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "admin" | "review">("dashboard");
  const [selectedSetId, setSelectedSetId] = useState<Id<"flashcardSets"> | null>(null);
  const isAdmin = useQuery(api.flashcards.isCurrentUserAdmin);

  const handleStartReview = (setId: Id<"flashcardSets">) => {
    setSelectedSetId(setId);
    setCurrentView("review");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedSetId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm h-16 flex justify-between items-center border-b dark:border-gray-700 shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-primary dark:text-blue-400">Study, Pass, Win!</h2>
          <Authenticated>
            {isAdmin && currentView !== "dashboard" && (
              <button
                onClick={handleBackToDashboard}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back to Dashboard
              </button>
            )}
          </Authenticated>
        </div>
        <div className="flex items-center gap-4">
          <DarkModeToggle />
          <Authenticated>
            {isAdmin && currentView === "dashboard" && (
              <button
                onClick={() => setCurrentView("admin")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Admin Panel
              </button>
            )}
            {isAdmin && currentView === "admin" && (
              <button
                onClick={() => setCurrentView("dashboard")}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                My Dashboard
              </button>
            )}
          </Authenticated>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <Content 
          currentView={currentView}
          selectedSetId={selectedSetId}
          onStartReview={handleStartReview}
          onBackToDashboard={handleBackToDashboard}
        />
      </main>
      <Toaster />
    </div>
  );
}

function Content({ 
  currentView, 
  selectedSetId, 
  onStartReview, 
  onBackToDashboard 
}: { 
  currentView: "dashboard" | "admin" | "review";
  selectedSetId: Id<"flashcardSets"> | null;
  onStartReview: (setId: Id<"flashcardSets">) => void;
  onBackToDashboard: () => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        {currentView === "dashboard" && <Dashboard onStartReview={onStartReview} />}
        {currentView === "admin" && <AdminPanel />}
        {currentView === "review" && selectedSetId && (
          <FlashcardReview setId={selectedSetId} onBack={onBackToDashboard} />
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Welcome to Flashcard Review</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Sign in to start reviewing your flashcards</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </>
  );
}
