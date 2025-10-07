import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"upload" | "assign">("upload");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage flashcard sets and user assignments</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "upload"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Upload Flashcard Set
            </button>
            <button
              onClick={() => setActiveTab("assign")}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === "assign"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Assign Sets to Users
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "upload" && <UploadTab />}
          {activeTab === "assign" && <AssignTab />}
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
        const parts = lines[i].split(",").map(p => p.trim().replace(/^"|"$/g, ""));
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">CSV Format:</span> The first row should be headers. Each subsequent row should have: Question, Answer, Hint (optional)
        </p>
        <p className="text-sm text-blue-900 mt-2">
          Example: <code className="bg-blue-100 px-1 rounded">What is 2+2?, 4, Think about basic addition</code>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Set Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Spanish Vocabulary - Level 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief description of this flashcard set"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV File
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const assignedUserIds = new Set(assignments?.map(a => a.userId) || []);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Flashcard Set
        </label>
        <select
          value={selectedSet || ""}
          onChange={(e) => setSelectedSet(e.target.value as Id<"flashcardSets"> || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <h3 className="font-semibold text-gray-900">Assign to Users</h3>
          
          {allUsers.length === 0 ? (
            <p className="text-gray-600 text-sm">No users found</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((user) => {
                const isAssigned = assignedUserIds.has(user._id);
                return (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      {user.name && <p className="text-sm text-gray-600">{user.name}</p>}
                    </div>
                    {isAssigned ? (
                      <button
                        onClick={() => handleRemove(user._id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssign(user._id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
