import { google } from 'googleapis';
import 'dotenv/config';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const base64Creds = process.env.GDRIVE_SERVICE_ACCOUNT_BASE64;
    const folderId = process.env.GDRIVE_FOLDER_ID;

    if (!base64Creds || !folderId) {
        return res.status(500).json({ error: 'Server configuration error: GDRIVE environment variables missing.' });
    }

    try {
        const creds = JSON.parse(Buffer.from(base64Creds, 'base64').toString('utf-8'));
        
        // Normalize private key (handle escaped newlines from env vars)
        const privateKey = creds.private_key.replace(/\\n/g, '\n');
        
        const auth = new google.auth.JWT(
            creds.client_email,
            null,
            privateKey,
            ['https://www.googleapis.com/auth/drive.readonly']
        );

        // Pre-authorize to ensure headers are established
        await auth.authorize();

        const drive = google.drive({ version: 'v3', auth });

        // Search for clips_db.json
        const list = await drive.files.list({
            q: `'${folderId}' in parents and name='clips_db.json' and trashed=false`,
            fields: 'files(id)',
            // Explicitly pass auth to ensure it's used
            auth: auth
        });

        if (!list.data.files || list.data.files.length === 0) {
            return res.status(404).json({ error: 'No clips database found on Google Drive. Run the analyzer first.' });
        }

        const fileId = list.data.files[0].id;
        const fileContent = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        // Set cache control for 60 seconds to improve performance
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        return res.status(200).json(fileContent.data);
    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ error: `Connection failed: ${error.message}` });
    }
}
