import { google, type drive_v3 } from "googleapis";

const ROOT_FOLDER_NAME = "INSPECCIONES";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

let cachedClient: drive_v3.Drive | null = null;
let cachedRootFolderId: string | null = null;

function getCredentials(): ServiceAccountCredentials | null {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.client_email && parsed.private_key) return parsed;
    // Support a shorthand {type, project_id, private_key, client_email, ...} JSON.
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    // Some paste the key with escaped \n; try to fix.
    try {
      const fixed = raw.replace(/\\n/g, "\n");
      const parsed = JSON.parse(fixed);
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch { /* fall through */ }
    return null;
  }
}

function getClient(): drive_v3.Drive | null {
  if (cachedClient) return cachedClient;
  const creds = getCredentials();
  if (!creds) return null;

  const auth = new (require("google-auth-library").GoogleAuth)({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  }) as any;
  cachedClient = google.drive({ version: "v3", auth });
  return cachedClient;
}

async function findOrCreateFolder(name: string, parentId?: string): Promise<string | null> {
  const drive = getClient();
  if (!drive) return null;

  const parentClause = parentId ? `'${parentId}' in parents and` : "";
  const escapedName = name.replace(/'/g, "\\'");
  try {
    const list = await drive.files.list({
      q: `${parentClause} name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
      pageSize: 1,
    });
    if (list.data.files && list.data.files.length > 0 && list.data.files[0].id) {
      return list.data.files[0].id;
    }
  } catch (err) {
    console.error("[Drive] Error al buscar carpeta:", err);
    return null;
  }

  try {
    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        ...(parentId ? { parents: [parentId] } : {}),
      },
      fields: "id",
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error("[Drive] Error al crear carpeta:", err);
    return null;
  }
}

async function getRootFolderId(): Promise<string | null> {
  if (cachedRootFolderId) return cachedRootFolderId;
  const id = await findOrCreateFolder(ROOT_FOLDER_NAME);
  cachedRootFolderId = id;
  return id;
}

function getMonthFolderName(date: string): string {
  // date is "YYYY-MM-DD"
  const [y, m] = date.split("-").map(Number);
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${months[m - 1]} ${y}`;
}

/**
 * Upload a PDF backup to Google Drive under INSPECCIONES/<Month Year>/.
 * Returns the Drive file id on success, null if disabled or on failure.
 * Never throws: failures are logged but do not interrupt the request flow.
 */
export async function backupInspectionPdf(
  pdfBuffer: Buffer,
  fileName: string,
  inspectionDate: string,
): Promise<string | null> {
  const drive = getClient();
  if (!drive) return null;

  try {
    const rootId = await getRootFolderId();
    if (!rootId) return null;

    const monthFolderName = getMonthFolderName(inspectionDate);
    const monthId = await findOrCreateFolder(monthFolderName, rootId);
    if (!monthId) return null;

    // Avoid duplicates: if a file with the same name exists in the month folder, replace it.
    const escapedName = fileName.replace(/'/g, "\\'");
    let existingId: string | null = null;
    try {
      const list = await drive.files.list({
        q: `'${monthId}' in parents and name='${escapedName}' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
        pageSize: 1,
      });
      if (list.data.files && list.data.files.length > 0 && list.data.files[0].id) {
        existingId = list.data.files[0].id;
      }
    } catch { /* proceed to create */ }

    const media = { mimeType: "application/pdf", body: pdfBuffer };

    if (existingId) {
      const res = await drive.files.update({ fileId: existingId, media, fields: "id" });
      console.log(`[Drive] PDF actualizado: ${fileName} (${res.data.id})`);
      return res.data.id ?? null;
    }

    const res = await drive.files.create({
      requestBody: { name: fileName, parents: [monthId] },
      media,
      fields: "id",
    });
    console.log(`[Drive] PDF respaldado: ${fileName} (${res.data.id})`);
    return res.data.id ?? null;
  } catch (err) {
    console.error("[Drive] Error al respaldar PDF:", err);
    return null;
  }
}

export function isDriveBackupEnabled(): boolean {
  return !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
}
