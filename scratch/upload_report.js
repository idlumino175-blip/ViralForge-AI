const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

async function run() {
    const oauthCredsPath = path.join(__dirname, '..', 'credentials', 'oauth-credentials.json');
    const tokenPath = path.join(__dirname, '..', 'credentials', 'token.json');
    const parentFolderId = process.env.GDRIVE_FOLDER_ID;
    
    if (!fs.existsSync(oauthCredsPath) || !fs.existsSync(tokenPath)) {
        console.error('❌ OAuth credentials or token missing');
        return;
    }

    const credentials = JSON.parse(fs.readFileSync(oauthCredsPath));
    const token = JSON.parse(fs.readFileSync(tokenPath));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    try {
        console.log(`📂 Creating sub-folder acting as user (parent: ${parentFolderId || 'root'})...`);
        const folderMetadata = {
            'name': 'ViralForge-AI-Premium-Setup',
            'mimeType': 'application/vnd.google-apps.folder',
            ...(parentFolderId ? { 'parents': [parentFolderId] } : {})
        };
        const folder = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id'
        });
        const folderId = folder.data.id;
        console.log(`✅ Folder created! ID: ${folderId}`);

        const filesToUpload = [
            { path: path.join(__dirname, '..', 'TROUBLESHOOTING_GUIDE.md'), name: 'TROUBLESHOOTING_GUIDE.md' },
            { path: path.join(__dirname, '..', 'COMPLETE_GUIDE.md'), name: 'COMPLETE_GUIDE.md' },
            { path: path.join(__dirname, '..', 'downloads', 'HD_BLUR_PREMIUM_TEST.mp4'), name: 'Premium_HD_Blur_Sample.mp4' }
        ];

        for (const file of filesToUpload) {
            if (fs.existsSync(file.path)) {
                console.log(`📤 Uploading ${file.name}...`);
                await drive.files.create({
                    requestBody: {
                        name: file.name,
                        parents: [folderId]
                    },
                    media: {
                        body: fs.createReadStream(file.path)
                    }
                });
                console.log(`✅ Uploaded ${file.name}`);
            } else {
                console.log(`⚠️ Skipping ${file.path} (not found)`);
            }
        }

        console.log('\n🚀 ALL DONE! Everything is safe in your Google Drive folder.');
        console.log(`Folder link: https://drive.google.com/drive/folders/${folderId}`);
    } catch (error) {
        console.error('❌ Error details:', error.response ? error.response.data : error.message);
    }
}

run();
