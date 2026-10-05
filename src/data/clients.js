// Clients and projects are no longer listed here: they come from the
// backend's project registry (GET /v2/admin/projects, backed by
// app/config/projects.json), the same list the backend validates against.

// Only ordinary users can be created from the Register page -- the admin is
// a fixed account, and the backend refuses any other role.
export const ROLES = ['User'];
