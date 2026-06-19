const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(process.cwd(), 'data');
const CUSTOM_ROLES_FILE = path.join(DATA_DIR, 'customRoles.json');

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(CUSTOM_ROLES_FILE);
  } catch {
    await fs.writeFile(CUSTOM_ROLES_FILE, '[]\n', 'utf8');
  }
}

async function readCustomRoles() {
  await ensureStorage();

  const raw = await fs.readFile(CUSTOM_ROLES_FILE, 'utf8');
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCustomRoles(customRoles) {
  await ensureStorage();
  await fs.writeFile(CUSTOM_ROLES_FILE, `${JSON.stringify(customRoles, null, 2)}\n`, 'utf8');
}

async function getCustomRoleByUserId(userId) {
  const customRoles = await readCustomRoles();
  return customRoles.find((item) => item.userId === userId) || null;
}

async function getCustomRoleByRoleId(roleId) {
  const customRoles = await readCustomRoles();
  return customRoles.find((item) => item.roleId === roleId) || null;
}

async function getAllCustomRoles() {
  return readCustomRoles();
}

async function upsertCustomRole(record) {
  const customRoles = await readCustomRoles();
  const index = customRoles.findIndex((item) => item.userId === record.userId);

  if (index === -1) {
    customRoles.push(record);
  } else {
    customRoles[index] = {
      ...customRoles[index],
      ...record
    };
  }

  await writeCustomRoles(customRoles);
  return record;
}

async function updateCustomRoleByUserId(userId, patch) {
  const customRoles = await readCustomRoles();
  const index = customRoles.findIndex((item) => item.userId === userId);

  if (index === -1) {
    return null;
  }

  customRoles[index] = {
    ...customRoles[index],
    ...patch
  };

  await writeCustomRoles(customRoles);
  return customRoles[index];
}

async function deleteCustomRoleByUserId(userId) {
  const customRoles = await readCustomRoles();
  const index = customRoles.findIndex((item) => item.userId === userId);

  if (index === -1) {
    return null;
  }

  const [removed] = customRoles.splice(index, 1);
  await writeCustomRoles(customRoles);
  return removed;
}

module.exports = {
  CUSTOM_ROLES_FILE,
  deleteCustomRoleByUserId,
  getAllCustomRoles,
  getCustomRoleByRoleId,
  getCustomRoleByUserId,
  readCustomRoles,
  updateCustomRoleByUserId,
  upsertCustomRole,
  writeCustomRoles
};
