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
    <div
      className="fixed top-0 left-0 right-0 flex items-center gap-3 py-2 px-4 text-white"
      style={{ zIndex: 1000, background: "#222" }}
    >
      <span className="font-semibold">Admin Impersonation</span>
      <select
        value={impersonatedUserId || currentUserId}
        onChange={e => onImpersonate(e.target.value)}
        className="ml-3 mr-3"
      >
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name} {u.id === currentUserId ? "(You)" : ""}
          </option>
        ))}
      </select>
      {impersonatedUserId && (
        <button
          onClick={onClear}
          className="ml-2 bg-white border-none rounded py-0.5 px-2"
          style={{ color: "#222" }}
        >
          Clear
        </button>
      )}
      <span className="ml-4 text-base opacity-70">
        (localhost only)
      </span>
    </div>
  );
};

export default ImpersonationToolbar;
