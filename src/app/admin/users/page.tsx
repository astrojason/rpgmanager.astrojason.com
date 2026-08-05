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

const SELECT_CLASS = "bg-grim-bg-3 border border-grim-line-2 text-grim-ink font-body text-lg py-1.5 px-2.5 outline-none rounded-xs";

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
    <div className="pt-9 px-12 pb-20">

      {/* Page header */}
      <header className="flex items-end justify-between gap-6 mb-7">
        <div>
          <div className="grim-page-eyebrow">Behind the Screen &middot; Permissions</div>
          <h1 className="grim-page-title text-7xl">User Management</h1>
          <p className="grim-page-sub">Manage roles and permissions — who may enter the Scriptorium.</p>
        </div>
        <button className="grim-btn is-ghost" onClick={loadUsers} disabled={loading}>
          {loading ? <span className="grim-flame inline-block" /> : "↺"} Refresh
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div
          className="border border-grim-blood-2 text-grim-error-text py-3 px-4 mb-4 font-body text-lg"
          style={{ background: "oklch(0.25 0.12 22 / 0.4)" }}
        >
          {error}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="bg-grim-success-bg border border-grim-moss text-grim-moss py-3 px-4 mb-4 font-body text-lg">
          {success}
        </div>
      )}

      {/* Role descriptions */}
      <section className="mb-7">
        <h2 className="grim-h-section">Roles of the Realm</h2>
        <div className="grid grid-cols-3 gap-3.5">

          {/* Admin */}
          <div className="grim-tome py-5 px-5.5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="font-display text-4xl text-grim-blood-2">⚙</span>
              <span className="font-head text-xl tracking-widest uppercase text-grim-ink">Administrator</span>
            </div>
            <span className="grim-chip is-blood mb-2.5">admin</span>
            <p className="font-body text-lg text-grim-ink-3 mt-2.5 mx-0 mb-0">Full system access</p>
          </div>

          {/* DM */}
          <div className="grim-tome py-5 px-5.5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="font-display text-4xl text-grim-ember">⚔</span>
              <span className="font-head text-xl tracking-widest uppercase text-grim-ink">Dungeon Master</span>
            </div>
            <span className="grim-chip is-ember mb-2.5">dm</span>
            <p className="font-body text-lg text-grim-ink-3 mt-2.5 mx-0 mb-0">Enhanced campaign access</p>
          </div>

          {/* Player */}
          <div className="grim-tome py-5 px-5.5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="font-display text-4xl text-grim-moss">⚑</span>
              <span className="font-head text-xl tracking-widest uppercase text-grim-ink">Player</span>
            </div>
            <span className="grim-chip is-alive mb-2.5">player</span>
            <p className="font-body text-lg text-grim-ink-3 mt-2.5 mx-0 mb-0">Standard user access</p>
          </div>

        </div>
      </section>

      {/* Users list */}
      <section>
        <h2 className="grim-h-section">
          Souls Registered
          {usersWithCharacters.length > 0 && (
            <span className="font-display text-2xl text-grim-gold ml-3 font-normal tracking-widest">
              {usersWithCharacters.length}
            </span>
          )}
        </h2>

        {/* Loading — no users yet */}
        {loading && usersWithCharacters.length === 0 ? (
          <div className="grim-tome flex items-center justify-center gap-3.5 py-12 px-7">
            <span className="grim-flame inline-block" />
            <span className="font-body text-xl text-grim-ink-3">Consulting the registry…</span>
          </div>

        /* Empty state */
        ) : usersWithCharacters.length === 0 ? (
          <div className="grim-tome text-center py-14 px-7">
            <div className="font-display text-7xl text-grim-ink-4 mb-3.5">⊕</div>
            <div className="font-head text-xl tracking-widest uppercase text-grim-ink-3 mb-2">No souls registered</div>
            <div className="font-body text-lg text-grim-ink-4">No users are currently recorded in the Scriptorium.</div>
          </div>

        /* User rows */
        ) : (
          <div className="flex flex-col gap-2">

            {/* Optional header row */}
            <div
              className="grid gap-3 py-1 px-5.5 items-center"
              style={{ gridTemplateColumns: "1fr 160px 200px 130px 140px" }}
            >
              <span className="grim-label">Soul</span>
              <span className="grim-label">Role</span>
              <span className="grim-label">Character</span>
              <span className="grim-label">Last Sign-in</span>
              <span className="grim-label text-right">Edit</span>
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
                  className="grim-tome grid gap-3 py-3.5 px-5.5 items-center"
                  style={{ gridTemplateColumns: "1fr 160px 200px 130px 140px" }}
                >
                  {/* Avatar + name/email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-display text-lg border"
                      style={{
                        background: ROLE_AVATAR_BG[user.role] ?? ROLE_AVATAR_BG.player,
                        borderColor: ROLE_AVATAR_BORDER[user.role] ?? ROLE_AVATAR_BORDER.player,
                        color: "oklch(0.92 0.04 80)",
                        boxShadow: "inset 0 1px 0 oklch(0.90 0.10 80 / 0.15)",
                      }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-head text-lg tracking-wider text-grim-ink truncate">
                        {user.displayName || "Unknown"}
                      </div>
                      <div className="grim-mono text-sm text-grim-ink-3 tracking-widest truncate">
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
                        className={SELECT_CLASS}
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
                        className={SELECT_CLASS}
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
                      <span className={`font-body text-lg ${user.assignedCharacter ? "text-grim-ink-2" : "text-grim-ink-4"}`}>
                        {charName}
                      </span>
                    )}
                  </div>

                  {/* Last sign-in */}
                  <div className="grim-mono text-sm text-grim-ink-4 tracking-widest">
                    {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : "Never"}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end items-center">
                    {isEditing ? (
                      <>
                        <button
                          className="grim-btn is-ember py-1.5 px-3 text-sm"
                          onClick={handleSaveRole}
                          disabled={loading}
                        >
                          {loading ? <span className="grim-flame inline-block w-1.5 h-1.5" /> : "✓"} Save
                        </button>
                        <button
                          className="grim-btn is-ghost py-1.5 px-3 text-sm text-grim-blood-2 border-grim-blood-2"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="grim-btn is-ghost py-1.5 px-3 text-sm"
                        onClick={() => handleEditRole(user)}
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
