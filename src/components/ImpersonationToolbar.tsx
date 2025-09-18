import React from "react";

interface ImpersonationToolbarProps {
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
  onImpersonate: (userId: string) => void;
  onClear: () => void;
  impersonatedUserId?: string;
}

const ImpersonationToolbar: React.FC<ImpersonationToolbarProps> = ({
  users,
  currentUserId,
  onImpersonate,
  onClear,
  impersonatedUserId,
}) => {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: "#222",
      color: "#fff",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <span style={{ fontWeight: 600 }}>Admin Impersonation</span>
      <select
        value={impersonatedUserId || currentUserId}
        onChange={e => onImpersonate(e.target.value)}
        style={{ marginLeft: 12, marginRight: 12 }}
      >
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name} {u.id === currentUserId ? "(You)" : ""}
          </option>
        ))}
      </select>
      {impersonatedUserId && (
        <button onClick={onClear} style={{ marginLeft: 8, color: "#222", background: "#fff", border: "none", borderRadius: 4, padding: "2px 8px" }}>
          Clear
        </button>
      )}
      <span style={{ marginLeft: 16, fontSize: 12, opacity: 0.7 }}>
        (localhost only)
      </span>
    </div>
  );
};

export default ImpersonationToolbar;
