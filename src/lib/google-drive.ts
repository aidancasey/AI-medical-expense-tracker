import { google } from "googleapis";

function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const res = await drive.files.list({ q: query, fields: "files(id, name)" });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });

  return folder.data.id!;
}

export async function uploadReceiptToDrive(
  accessToken: string,
  file: Buffer,
  mimeType: string,
  fileName: string,
  year: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient(accessToken);

  // Create folder hierarchy: Medical / [year] / expenses
  const medicalFolderId = await findOrCreateFolder(drive, "Medical");
  const yearFolderId = await findOrCreateFolder(drive, year, medicalFolderId);
  const expensesFolderId = await findOrCreateFolder(
    drive,
    "expenses",
    yearFolderId
  );

  // Upload file
  const { Readable } = await import("stream");
  const stream = new Readable();
  stream.push(file);
  stream.push(null);

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [expensesFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: uploaded.data.id!,
    webViewLink:
      uploaded.data.webViewLink ||
      `https://drive.google.com/file/d/${uploaded.data.id}/view`,
  };
}
