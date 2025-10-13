import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"upload" | "assign" | "edit" | "progress">("upload");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Panel</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage flashcard sets and user assignments</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "upload"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Upload Flashcard Set
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "edit"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Edit Sets
            </button>
            <button
              onClick={() => setActiveTab("assign")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "assign"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Assign Sets to Users
            </button>
            <button
              onClick={() => setActiveTab("progress")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "progress"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              User Progress
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "upload" && <UploadTab />}
          {activeTab === "edit" && <EditTab />}
          {activeTab === "assign" && <AssignTab />}
          {activeTab === "progress" && <ProgressTab />}
        </div>
      </div>
    </div>
  );
}

function UploadTab() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const createFlashcardSet = useMutation(api.flashcards.createFlashcardSet);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Handle escaped quotes ("")
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !description || !csvContent) {
      toast.error("Please fill in all fields and upload a CSV file");
      return;
    }

    setIsUploading(true);
    try {
      const lines = csvContent.split("\n").filter(line => line.trim());
      const cards = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length >= 2) {
          cards.push({
            question: parts[0],
            answer: parts[1],
            hint: parts[2] || undefined,
          });
        }
      }

      if (cards.length === 0) {
        toast.error("No valid flashcards found in CSV");
        return;
      }

      await createFlashcardSet({ name, description, cards });
      toast.success(`Flashcard set "${name}" created with ${cards.length} cards`);
      
      setName("");
      setDescription("");
      setCsvContent("");
      const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error: any) {
      toast.error(error.message || "Failed to create flashcard set");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <span className="font-semibold">CSV Format:</span> The first row should be headers. Each subsequent row should have: Question, Answer, Hint (optional)
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-300 mt-2">
          Example: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">What is 2+2?, 4, Think about basic addition</code>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Set Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Spanish Vocabulary - Level 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Brief description of this flashcard set"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload CSV File
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
        >
          {isUploading ? "Creating..." : "Create Flashcard Set"}
        </button>
      </form>
    </div>
  );
}

function AssignTab() {
  const allSets = useQuery(api.flashcards.getAllSets);
  const allUsers = useQuery(api.flashcards.getAllUsers);
  const [selectedSet, setSelectedSet] = useState<Id<"flashcardSets"> | null>(null);
  const assignments = useQuery(
    api.flashcards.getSetAssignments,
    selectedSet ? { setId: selectedSet } : "skip"
  );
  const assignSetToUser = useMutation(api.flashcards.assignSetToUser);
  const removeSetAssignment = useMutation(api.flashcards.removeSetAssignment);

  const handleAssign = async (userId: Id<"users">) => {
    if (!selectedSet) return;
    
    try {
      await assignSetToUser({ userId, setId: selectedSet });
      toast.success("Set assigned successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign set");
    }
  };

  const handleRemove = async (userId: Id<"users">) => {
    if (!selectedSet) return;
    
    try {
      await removeSetAssignment({ userId, setId: selectedSet });
      toast.success("Assignment removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove assignment");
    }
  };

  if (allSets === undefined || allUsers === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  const assignedUserIds = new Set(assignments?.map(a => a.userId) || []);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Flashcard Set
        </label>
        <select
          value={selectedSet || ""}
          onChange={(e) => setSelectedSet(e.target.value as Id<"flashcardSets"> || null)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">-- Select a set --</option>
          {allSets.map((set) => (
            <option key={set._id} value={set._id}>
              {set.name} ({set.cardCount} cards, {set.assignedUsers} users)
            </option>
          ))}
        </select>
      </div>

      {selectedSet && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Assign to Users</h3>
          
          {allUsers.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">No users found</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((user) => {
                const isAssigned = assignedUserIds.has(user._id);
                return (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                      {user.name && <p className="text-sm text-gray-600 dark:text-gray-400">{user.name}</p>}
                    </div>
                    {isAssigned ? (
                      <button
                        onClick={() => handleRemove(user._id)}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssign(user._id)}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditTab() {
  const allSets = useQuery(api.flashcards.getAllSets);
  const [selectedSet, setSelectedSet] = useState<Id<"flashcardSets"> | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const updateFlashcardSet = useMutation(api.flashcards.updateFlashcardSet);

  const handleSelectSet = (setId: string) => {
    const id = setId as Id<"flashcardSets">;
    setSelectedSet(id || null);
    
    if (id && allSets) {
      const set = allSets.find(s => s._id === id);
      if (set) {
        setName(set.name);
        setDescription(set.description);
      }
    } else {
      setName("");
      setDescription("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSet || !name || !description) {
      toast.error("Please select a set and fill in all fields");
      return;
    }

    setIsUpdating(true);
    try {
      await updateFlashcardSet({ setId: selectedSet, name, description });
      toast.success("Flashcard set updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update flashcard set");
    } finally {
      setIsUpdating(false);
    }
  };

  if (allSets === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Flashcard Set to Edit
        </label>
        <select
          value={selectedSet || ""}
          onChange={(e) => handleSelectSet(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">-- Select a set to edit --</option>
          {allSets.map((set) => (
            <option key={set._id} value={set._id}>
              {set.name} ({set.cardCount} cards)
            </option>
          ))}
        </select>
      </div>

      {selectedSet && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Set Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Spanish Vocabulary - Level 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Brief description of this flashcard set"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
          >
            {isUpdating ? "Updating..." : "Update Flashcard Set"}
          </button>
        </form>
      )}
    </div>
  );
}

function ProgressTab() {
  const userProgress = useQuery(api.flashcards.getAllUserProgress);

  if (userProgress === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (userProgress.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {userProgress.map((user) => (
        <div
          key={user.userId}
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.email}
            </h3>
            {user.name && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.name}</p>
            )}
          </div>

          {user.sets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No flashcard sets assigned to this user
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {user.sets.map((set) => (
                <div
                  key={set.setId}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {set.setName}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {set.reviewedCards} / {set.totalCards} cards reviewed
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="text-green-700 dark:text-green-400 font-medium mb-1">
                        Correct Answers
                      </div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                        {set.correctCount}
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="text-red-700 dark:text-red-400 font-medium mb-1">
                        Incorrect Answers
                      </div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-300">
                        {set.incorrectCount}
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="text-blue-700 dark:text-blue-400 font-medium mb-1">
                        Mastered Cards
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                        {set.masteredCards}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${set.totalCards > 0 ? (set.masteredCards / set.totalCards) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {set.totalCards > 0 
                        ? `${Math.round((set.masteredCards / set.totalCards) * 100)}% mastered`
                        : '0% mastered'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
