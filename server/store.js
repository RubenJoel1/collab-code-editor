// Shared in-memory state used by the socket handler and REST routes.

// roomId -> { document: string, language: string, users: Map<socketId, {...}> }
const rooms = new Map();

// roomId -> [{ version_id, snapshot, language, saved_by, created_at }]  (newest first)
const versionHistory = new Map();

function addVersion(roomId, snapshot, language, savedBy) {
  if (!versionHistory.has(roomId)) versionHistory.set(roomId, []);
  versionHistory.get(roomId).unshift({
    version_id: `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    snapshot,
    language,
    saved_by: savedBy,
    created_at: new Date().toISOString(),
  });
}

function getVersions(roomId) {
  return versionHistory.get(roomId) ?? [];
}

function removeVersion(versionId) {
  for (const [roomId, versions] of versionHistory) {
    const idx = versions.findIndex((v) => v.version_id === versionId);
    if (idx !== -1) {
      versions.splice(idx, 1);
      return true;
    }
  }
  return false;
}

module.exports = { rooms, versionHistory, addVersion, getVersions, removeVersion };
