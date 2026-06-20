"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFunctions, httpsCallable } from "firebase/functions";
import { PC } from "@/types/interfaces";
import { authFetch } from "@/utils/authFetch";

interface UserData {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  lastSignIn?: string;
  created?: string;
  assignedCharacter?: string | null; // PC ID
}

interface RoleUpdateData {
  uid: string;
  role: string;
}

const ROLE_AVATAR_BG: Record<string, string> = {
  admin:  "linear-gradient(180deg, oklch(0.40 0.16 22), oklch(0.28 0.14 22))",
  dm:     "linear-gradient(180deg, oklch(0.40 0.12 40), oklch(0.28 0.08 35))",
  player: "linear-gradient(180deg, oklch(0.38 0.09 145), oklch(0.24 0.06 145))",
};

const ROLE_AVATAR_BORDER: Record<string, string> = {
  admin:  "var(--grim-blood-2)",
  dm:     "var(--grim-ember)",
  player: "oklch(0.55 0.090 145)",
};

const SELECT_STYLE: React.CSSProperties = {
  background: "var(--grim-bg-3)",
  border: "1px solid var(--grim-line-2)",
  color: "var(--grim-ink)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  padding: "6px 10px",
  outline: "none",
  borderRadius: 2,
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { data: pcs = [] } = useQuery<PC[]>({
    queryKey: ['/api/data/pcs'],
    queryFn: () => authFetch('/api/data/pcs').then(r => r.ok ? r.json() : []),
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newCharacter, setNewCharacter] = useState<string>("");

  const roles = [
    { value: "player", label: "Player", description: "Standard user access" },
    { value: "dm", label: "Dungeon Master", description: "Enhanced campaign access" },
    { value: "admin", label: "Administrator", description: "Full system access" }
  ];

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const functions = getFunctions();
      const listUsers = httpsCallable(functions, 'listUsers');
      const result = await listUsers();
      const userData = result.data as UserData[];
      const normalizeRole = (role: string) => role === 'admin' || role === 'dm' || role === 'player' ? role : 'player';
      setUsers(userData.map(u => ({ ...u, role: normalizeRole(u.role) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const usersWithCharacters = useMemo(() =>
    users.map(user => ({
      ...user,
      assignedCharacter: pcs.find(pc => pc.player === user.uid)?.id || null,
    })),
    [users, pcs]
  );

  const updateUserRole = async (uid: string, role: string) => {
    setLoading(true);
    setError("");
    setSuccess("");
    const normalizedRole = role === 'admin' || role === 'dm' || role === 'player' ? role : 'player';

    try {
      const functions = getFunctions();
      const setUserRole = httpsCallable<RoleUpdateData>(functions, 'setUserRole');
      await setUserRole({ uid, role: normalizedRole });

      // Update local state and ensure we don't drop other edits
      setUsers((prev) => prev.map(user =>
        user.uid === uid ? { ...user, role: normalizedRole } : user
      ));

      setEditingUser(null);
      setNewRole("");
      setSuccess(`User role updated to ${normalizedRole} successfully!`);
      // Reload from server to reflect updated custom claims
      loadUsers();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user role");
    } finally {
      setLoading(false);
    }
  };

  const updateCharacterAssignment = async (uid: string, characterId: string | null) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Update PCs data
      const updatedPcs = pcs.map(pc => {
        // Remove assignment from previous character
        if (pc.player === uid) {
          return { ...pc, player: null };
        }
        // Assign to new character
        if (pc.id === characterId) {
          return { ...pc, player: uid };
        }
        return pc;
      });

      // Save to API
      const response = await authFetch('/api/data/pcs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPcs),
      });

      if (!response.ok) {
        throw new Error('Failed to save character assignment');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/data/pcs'] });

      const characterName = characterId ? pcs.find(pc => pc.id === characterId)?.name : 'None';
      setSuccess(`Character assignment updated to ${characterName} successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update character assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (editingUser && (newRole || newCharacter !== undefined)) {
      const user = usersWithCharacters.find(u => u.uid === editingUser);
      if (!user) return;

      // Update role if changed
      if (newRole && newRole !== user.role) {
        await updateUserRole(editingUser, newRole);
      }

      // Update character assignment if changed
      if (newCharacter !== undefined && newCharacter !== (user.assignedCharacter || "")) {
        await updateCharacterAssignment(editingUser, newCharacter || null);
      }

      setEditingUser(null);
      setNewRole("");
      setNewCharacter("");
    }
  };

  const handleEditRole = (user: UserData) => {
    setEditingUser(user.uid);
    setNewRole(user.role);
    setNewCharacter(user.assignedCharacter || "");
    setError("");
    setSuccess("");
  };

  const handleSaveRole = () => {
    handleSaveChanges();
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewRole("");
    setNewCharacter("");
    setError("");
  };

  const getRoleChipClass = (role: string) => {
    switch (role) {
      case "admin":  return "grim-chip is-blood";
      case "dm":     return "grim-chip is-ember";
      case "player":
      default:       return "grim-chip is-alive";
    }
  };

  const getRoleGlyph = (role: string) => {
    switch (role) {
      case "admin":  return "⚙";
      case "dm":     return "⚔";
      case "player":
      default:       return "⚑";
    }
  };

  const getInitials = (displayName?: string, email?: string) => {
    if (displayName) {
      const parts = displayName.trim().split(" ");
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : displayName.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "⊕";
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div style={{ padding: "36px 48px 80px" }}>

      {/* Page header */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Permissions</div>
          <h1 className="grim-page-title" style={{ fontSize: 58 }}>User Management</h1>
          <p className="grim-page-sub">Manage roles and permissions — who may enter the Scriptorium.</p>
        </div>
        <button className="grim-btn is-ghost" onClick={loadUsers} disabled={loading}>
          {loading ? <span className="grim-flame" style={{ display: "inline-block" }} /> : "↺"} Refresh
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div style={{
          background: "oklch(0.25 0.12 22 / 0.4)",
          border: "1px solid var(--grim-blood-2)",
          color: "oklch(0.85 0.08 30)",
          padding: "12px 16px",
          marginBottom: 16,
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div style={{
          background: "oklch(0.25 0.10 145 / 0.4)",
          border: "1px solid oklch(0.55 0.090 145)",
          color: "var(--grim-moss)",
          padding: "12px 16px",
          marginBottom: 16,
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}>
          {success}
        </div>
      )}

      {/* Role descriptions */}
      <section style={{ marginBottom: 28 }}>
        <h2 className="grim-h-section">Roles of the Realm</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>

          {/* Admin */}
          <div className="grim-tome" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-blood-2)" }}>⚙</span>
              <span style={{ fontFamily: "var(--font-head)", fontSize: 15, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink)" }}>Administrator</span>
            </div>
            <span className="grim-chip is-blood" style={{ marginBottom: 10 }}>admin</span>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)", margin: "10px 0 0" }}>Full system access</p>
          </div>

          {/* DM */}
          <div className="grim-tome" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-ember)" }}>⚔</span>
              <span style={{ fontFamily: "var(--font-head)", fontSize: 15, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink)" }}>Dungeon Master</span>
            </div>
            <span className="grim-chip is-ember" style={{ marginBottom: 10 }}>dm</span>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)", margin: "10px 0 0" }}>Enhanced campaign access</p>
          </div>

          {/* Player */}
          <div className="grim-tome" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--grim-moss)" }}>⚑</span>
              <span style={{ fontFamily: "var(--font-head)", fontSize: 15, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--grim-ink)" }}>Player</span>
            </div>
            <span className="grim-chip is-alive" style={{ marginBottom: 10 }}>player</span>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--grim-ink-3)", margin: "10px 0 0" }}>Standard user access</p>
          </div>

        </div>
      </section>

      {/* Users list */}
      <section>
        <h2 className="grim-h-section">
          Souls Registered
          {usersWithCharacters.length > 0 && (
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--grim-gold)", marginLeft: 12, fontWeight: "normal", letterSpacing: ".08em" }}>
              {usersWithCharacters.length}
            </span>
          )}
        </h2>

        {/* Loading — no users yet */}
        {loading && usersWithCharacters.length === 0 ? (
          <div className="grim-tome" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "48px 28px" }}>
            <span className="grim-flame" style={{ display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--grim-ink-3)" }}>Consulting the registry…</span>
          </div>

        /* Empty state */
        ) : usersWithCharacters.length === 0 ? (
          <div className="grim-tome" style={{ textAlign: "center", padding: "56px 28px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--grim-ink-4)", marginBottom: 14 }}>⊕</div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 16, letterSpacing: ".10em", textTransform: "uppercase", color: "var(--grim-ink-3)", marginBottom: 8 }}>No souls registered</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--grim-ink-4)" }}>No users are currently recorded in the Scriptorium.</div>
          </div>

        /* User rows */
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Optional header row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 200px 130px 140px",
              gap: 12,
              padding: "4px 22px",
              alignItems: "center",
            }}>
              <span className="grim-label">Soul</span>
              <span className="grim-label">Role</span>
              <span className="grim-label">Character</span>
              <span className="grim-label">Last Sign-in</span>
              <span className="grim-label" style={{ textAlign: "right" }}>Edit</span>
            </div>

            {usersWithCharacters.map((user) => {
              const isEditing = editingUser === user.uid;
              const initials = getInitials(user.displayName, user.email);
              const charName = user.assignedCharacter
                ? (() => {
                    const pc = pcs.find(p => p.id === user.assignedCharacter);
                    return pc ? `${pc.name}${pc.nickname ? ` "${pc.nickname}"` : ""}` : "Unknown";
                  })()
                : "No Character";

              return (
                <div
                  key={user.uid}
                  className="grim-tome"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 200px 130px 140px",
                    gap: 12,
                    padding: "14px 22px",
                    alignItems: "center",
                  }}
                >
                  {/* Avatar + name/email */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, flexShrink: 0, borderRadius: "50%",
                      background: ROLE_AVATAR_BG[user.role] ?? ROLE_AVATAR_BG.player,
                      border: "1px solid " + (ROLE_AVATAR_BORDER[user.role] ?? ROLE_AVATAR_BORDER.player),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontSize: 14,
                      color: "oklch(0.92 0.04 80)",
                      boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.15)",
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 14, letterSpacing: ".04em", color: "var(--grim-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.displayName || "Unknown"}
                      </div>
                      <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-3)", letterSpacing: ".08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    {isEditing ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        style={SELECT_STYLE}
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={getRoleChipClass(user.role)}>
                        {getRoleGlyph(user.role)} {roles.find(r => r.value === user.role)?.label || user.role}
                      </span>
                    )}
                  </div>

                  {/* Character */}
                  <div>
                    {isEditing ? (
                      <select
                        value={newCharacter}
                        onChange={(e) => setNewCharacter(e.target.value)}
                        style={SELECT_STYLE}
                      >
                        <option value="">No Character</option>
                        {pcs
                          .filter(pc => !pc.player || pc.player === user.uid || pc.id === newCharacter)
                          .map((pc) => (
                          <option key={pc.id} value={pc.id}>
                            {pc.name} {pc.nickname ? `"${pc.nickname}"` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: user.assignedCharacter ? "var(--grim-ink-2)" : "var(--grim-ink-4)" }}>
                        {charName}
                      </span>
                    )}
                  </div>

                  {/* Last sign-in */}
                  <div className="grim-mono" style={{ fontSize: 11, color: "var(--grim-ink-4)", letterSpacing: ".08em" }}>
                    {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : "Never"}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                    {isEditing ? (
                      <>
                        <button
                          className="grim-btn is-ember"
                          onClick={handleSaveRole}
                          disabled={loading}
                          style={{ padding: "6px 12px", fontSize: 11 }}
                        >
                          {loading ? <span className="grim-flame" style={{ display: "inline-block", width: 6, height: 6 }} /> : "✓"} Save
                        </button>
                        <button
                          className="grim-btn is-ghost"
                          onClick={handleCancelEdit}
                          style={{ padding: "6px 12px", fontSize: 11, color: "var(--grim-blood-2)", borderColor: "var(--grim-blood-2)" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="grim-btn is-ghost"
                        onClick={() => handleEditRole(user)}
                        style={{ padding: "6px 12px", fontSize: 11 }}
                      >
                        ✎ Edit
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
