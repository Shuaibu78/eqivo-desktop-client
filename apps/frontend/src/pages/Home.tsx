import { useEffect, useState } from "react";
import { electronAPI, isElectronAvailable } from "../api/electron";

interface Call {
  id: string;
  to: string;
  status: string;
  timestamp: number;
}

function Home() {
  const [number, setNumber] = useState("");
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);

  // Load call history and mock mode on mount
  useEffect(() => {
    if (isElectronAvailable) {
      loadCallHistory();
      loadMockMode();
    }
  }, []);

  const loadMockMode = async () => {
    try {
      const isMock = await electronAPI.getMockMode();
      setMockMode(isMock);
    } catch (err) {
      console.error("Failed to load mock mode", err);
    }
  };

  const handleToggleMockMode = async () => {
    const newMode = !mockMode;
    setMockMode(newMode);
    electronAPI.setMockMode(newMode);
  };

  // Listen for call status updates
  useEffect(() => {
    if (!isElectronAvailable) return;

    const handleStatus = (data: {
      callId: string;
      status: string;
      call?: Call;
    }) => {
      // Clear loading state when call is initiated or ended
      if (data.status === "initiated" || data.status === "ended") {
        setLoading(false);
      }

      if (data.call) {
        setCalls((prev) => {
          const existing = prev.findIndex((c) => c.id === data.call!.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], status: data.status };
            return updated;
          }
          return [data.call!, ...prev];
        });
      } else {
        // Update existing call status
        setCalls((prev) =>
          prev.map((call) =>
            call.id === data.callId ? { ...call, status: data.status } : call
          )
        );
      }
    };

    electronAPI.onCallStatus(handleStatus);

    return () => {
      // Cleanup: Remove listeners when component unmounts
      // Note: In a production app, you'd want to properly remove IPC listeners
    };
  }, []);

  // Listen for errors
  useEffect(() => {
    if (!isElectronAvailable) return;

    const handleError = (err: { message: string }) => {
      setError(err.message);
      setLoading(false);
      setTimeout(() => setError(null), 5000);
    };

    electronAPI.onError(handleError);

    return () => {
      // Cleanup
    };
  }, []);

  // Listen for mock mode changes from tray menu
  useEffect(() => {
    if (!isElectronAvailable) return;

    const handleMockModeChanged = (data: { enabled: boolean }) => {
      setMockMode(data.enabled);
    };

    electronAPI.onMockModeChanged(handleMockModeChanged);

    return () => {
      // Cleanup
    };
  }, []);

  const loadCallHistory = async () => {
    try {
      const history = await electronAPI.getCallHistory();
      setCalls(history);
    } catch (err) {
      console.error("Failed to load call history", err);
    }
  };

  const handleCall = async () => {
    if (!number.trim()) {
      setError("Please enter a phone number");
      return;
    }

    if (!isElectronAvailable) {
      setError("Electron API not available. Please run the desktop app.");
      return;
    }

    setLoading(true);
    setError(null);
    electronAPI.startCall(number);
    setNumber("");
    // Loading state will be cleared when call status updates to "initiated" or "ended", or on error
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "initiated":
        return "text-blue-600";
      case "ringing":
        return "text-yellow-600";
      case "answered":
        return "text-green-600";
      case "ended":
        return "text-gray-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (!isElectronAvailable) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Electron API Not Available
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This application must be run in the Electron desktop app.
            <br />
            Please use{" "}
            <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
              yarn dev
            </code>{" "}
            to start the desktop application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Eqivo Telephony Client
          </h1>
          {/* Mock Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              MOCK API
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={mockMode}
                onChange={handleToggleMockMode}
                className="sr-only"
              />
              <div
                className={`w-14 h-7 rounded-full transition-colors duration-200 ${
                  mockMode ? "bg-yellow-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    mockMode ? "translate-x-7" : "translate-x-1"
                  } mt-0.5`}
                />
              </div>
            </div>
          </label>
        </div>

        {mockMode && (
          <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-yellow-800 dark:text-yellow-200 font-semibold">
                🔧 Mock Mode Active
              </span>
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                API calls are simulated. No real calls will be made.
              </span>
            </div>
          </div>
        )}

        {/* Call Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Make a Call
          </h2>
          <div className="flex gap-4">
            <input
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCall()}
              placeholder="Enter phone number (e.g., +1234567890)"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
            <button
              onClick={handleCall}
              disabled={loading || !number.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Calling..." : "Call"}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Call History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Call History
          </h2>
          {calls.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No calls yet. Make your first call above!
            </p>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {call.to}
                      </span>
                      <span
                        className={`text-sm font-semibold ${getStatusColor(
                          call.status
                        )}`}
                      >
                        {call.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(call.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
