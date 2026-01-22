import React, { useEffect, useState } from "react";

type RulesStatus = {
  counts: Record<string, number>;
  last_sync: Record<string, number | null>;
};

type SyncResult = {
  synced: Record<string, number>;
};

export default function RulesSync() {
  const [status, setStatus] = useState<RulesStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rulesKinds = ["races", "feats", "skills", "weapons", "attacks"];

  // Fetch current status
  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/rules/status");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: RulesStatus = await resp.json();
      setStatus(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // Manual sync - sync all kinds
  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const resp = await fetch("/api/rules/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kinds: rulesKinds }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      
      // Update status after sync completes
      await new Promise(r => setTimeout(r, 500));
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setSyncing(false);
    }
  };

  // Load initial status on mount
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    try {
      return new Date(timestamp * 1000).toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  return (
    <div style={{ padding: "16px", border: "1px solid #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <h3>📚 5e Rulesets (Offline Support)</h3>

      {/* Status */}
      {loading ? (
        <p>Loading status...</p>
      ) : status ? (
        <div style={{ marginBottom: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #999" }}>
                <th style={{ textAlign: "left", padding: "8px" }}>Type</th>
                <th style={{ textAlign: "center", padding: "8px" }}>Count</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {rulesKinds.map((kind) => (
                <tr key={kind} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "8px" }}>{kind}</td>
                  <td style={{ textAlign: "center", padding: "8px" }}>{status.counts[kind] || 0}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    <button
                      onClick={() => handleSync()}
                      disabled={syncing}
                      title={`Update ${kind}. Last sync: ${formatTime(status.last_sync[kind])}`}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        cursor: syncing ? "not-allowed" : "pointer",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      ↻
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Refresh Button */}
      <button
        onClick={fetchStatus}
        disabled={loading}
        style={{
          padding: "8px 12px",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "12px",
        }}
      >
        {loading ? "Loading..." : "Refresh Status"}
      </button>

      {/* Error Display */}
      {error && (
        <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#ffebee", borderRadius: "4px", color: "#c62828" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Info */}
      <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#e3f2fd", borderRadius: "4px", fontSize: "0.9em", color: "#1565c0" }}>
        <strong>ℹ️ Offline Support:</strong> Rulesets are cached locally and available for offline play. Syncing pulls the latest data from the Open5e API.
      </div>
    </div>
  );
}
