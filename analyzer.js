/**
 * Viral Clip Analyzer - Extract ALL viral clips from YouTube videos
 * Uses Gemini AI to find multiple viral moments in long-form content
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const { google } = require('googleapis');

// API Keys - Priority: Environment Variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_MODEL = 'gemini-3-flash-preview';

// Google Drive config
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID || '';

/**
 * Initialize Google Drive Client
 */
let drive = null;
if (process.env.GDRIVE_SERVICE_ACCOUNT_BASE64) {
    try {
        const creds = JSON.parse(Buffer.from(process.env.GDRIVE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8'));
        const auth = new google.auth.JWT(creds.client_email, null, creds.private_key, ['https://www.googleapis.com/auth/drive.file']);
        drive = google.drive({ version: 'v3', auth });
        console.log('✅ Google Drive connected!');
    } catch (e) { console.log('⚠️  GDrive auth failed:', e.message); }
}

async function updateMetadataDB(clipData) {
    if (!drive || !GDRIVE_FOLDER_ID) return;
    try {
        console.log(`   🗄️  Syncing metadata to Google Drive database...`);
        // 1. Search for existing database
        const list = await drive.files.list({
            q: `'${GDRIVE_FOLDER_ID}' in parents and name='clips_db.json' and trashed=false`,
            fields: 'files(id)'
        });
        
        let db = [];
        let dbFileId = null;
        
        if (list.data.files && list.data.files.length > 0) {
            dbFileId = list.data.files[0].id;
            const res = await drive.files.get({ fileId: dbFileId, alt: 'media' });
            db = res.data;
        }

        // 2. Add new entry
        db.unshift({
            ...clipData,
            processedAt: new Date().toISOString()
        });

        // Keep last 100 clips
        if (db.length > 100) db = db.slice(0, 100);

        // 3. Upload back
        const media = {
            mimeType: 'application/json',
            body: JSON.stringify(db, null, 2)
        };

        if (dbFileId) {
            await drive.files.update({ fileId: dbFileId, media });
        } else {
            await drive.files.create({
                requestBody: { name: 'clips_db.json', parents: [GDRIVE_FOLDER_ID] },
                media,
                fields: 'id'
            });
        }
        console.log(`   ✅ Database synced!`);
    } catch (e) { console.log(`   ⚠️  Meta Sync failed:`, e.message); }
}

async function uploadToDrive(filePath, fileName) {
    if (!drive || !GDRIVE_FOLDER_ID) return null;
    try {
        console.log(`   📤 Uploading to Google Drive: ${fileName}...`);
        const res = await drive.files.create({
            requestBody: { name: fileName, parents: [GDRIVE_FOLDER_ID] },
            media: { body: fs.createReadStream(filePath) },
            fields: 'id, webViewLink'
        });
        console.log(`   ✅ Uploaded!`);
        return { id: res.data.id, link: res.data.webViewLink };
    } catch (e) { console.log(`   ❌ Upload failed: ${e.message}`); return null; }
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function httpPost(url, postData) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = https.request({
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(postData));
        req.end();
    });
}

/**
 * Extract video ID from URL
 */
function extractVideoId(url) {
    if (url.includes('watch?v=')) return url.split('watch?v=')[1].split('&')[0];
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
    if (url.includes('youtube.com/shorts/')) return url.split('/shorts/')[1].split('?')[0];
    return null;
}

/**
 * Get video details including duration
 */
async function getVideoDetails(videoId) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    const data = await httpGet(url);

    if (data.items && data.items[0]) {
        const item = data.items[0];
        return {
            title: item.snippet.title,
            description: item.snippet.description,
            duration: item.contentDetails.duration,
            viewCount: parseInt(item.statistics.viewCount || 0),
            likeCount: parseInt(item.statistics.likeCount || 0),
            commentCount: parseInt(item.statistics.commentCount || 0)
        };
    }
    return null;
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Get video description text
 */
async function fetchDescription(videoId) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const data = await httpGet(url);
        return data.items?.[0]?.snippet?.description || "";
    } catch (e) { return ""; }
}

/**
 * Fetch video transcript using yt-dlp
 */
async function fetchTranscript(videoId) {
    const tempFile = `transcript_${videoId}.vtt`;
    const cmd = `yt-dlp --write-auto-subs --skip-download --sub-format vtt --output "${tempFile}" "https://youtube.com/watch?v=${videoId}"`;
    try {
        console.log('  Fetching transcript...');
        execSync(cmd, { stdio: 'ignore', timeout: 30000 });
        const files = fs.readdirSync('.');
        const vttFile = files.find(f => f.startsWith(`transcript_${videoId}`) && f.endsWith('.vtt'));
        if (vttFile) {
            const content = fs.readFileSync(vttFile, 'utf8');
            const lines = content.split('\n')
                .filter(l => !l.includes('-->') && l.trim() !== '' && !l.match(/^\d+$/) && !l.startsWith('WEBVTT'))
                .map(l => l.trim().replace(/<[^>]+>/g, ''))
                .filter((l, i, arr) => l !== arr[i-1]);
            fs.unlinkSync(vttFile);
            return lines.join(' ').substring(0, 5000); // reduced from 10k to 5k
        }
    } catch (e) {}
    return null;
}

/**
 * Find ALL viral clips from a video using Gemini AI
 */
async function findViralClips(videoData, videoId, transcript = null, description = null) {
    const durationSeconds = parseDuration(videoData.duration);
    const durationFormatted = formatTime(durationSeconds);

    console.log(`  Video duration: ${durationFormatted}`);
    console.log(`  Views: ${videoData.viewCount.toLocaleString()}`);

    const context = `
TRANSCRIPT: ${transcript || "Not available"}
DESCRIPTION/TIMESTAMPS: ${description || "Not available"}
`;

    const prompt = `You are a viral content expert for Gen Z (Shorts/Reels/TikTok). Find 8 to 10 HIGH-IMPACT viral clips.

VIDEO: ${videoData.title}
DURATION: ${durationFormatted}
${context}

DANGER - INTRO/AD RULES:
- SKIP all introductions like "Welcome back", "Hey guys", etc.
- SKIP all sponsor segments and ads.
- START the clip exactly when the core story, joke, or hot take begins.
- If the first 5 seconds of a topic are "filler," move the start time forward.

TARGET CATEGORIES (Priority Order):
1. 🌍 GEOPOLITICS: Pakistan, China, America, global tensions, wars, government failures.
2. 🤫 AFFAIRS/BEEF: Celebrity affairs, hidden secrets, YouTuber/Bollywood beefs.
3. 🔥 CONTROVERSY: Polarizing opinions, calling out society, savage debates.
4. 🔪 HARD TRUTHS: Offensive but real societal truths, calling out the rich/poor cycle, brutal honesty.

Do NOT pick plain educational topics. Only pick moments where the speaker goes off-script to give a divisive, raw, or deeply controversial opinion.

Return JSON array:
[
  {
    "clip_number": 1,
    "timestamp_start": "1:23",
    "timestamp_end": "2:15",
    "title": "Viral Clickbait Title",
    "description": "What happens in the clip",
    "viral_reason": "Why it will get 1M+ views",
    "hook": "Exact opening line",
    "category": "SPICY",
    "spice_level": 10,
    "caption": "Viral caption with emojis",
    "hashtags": ["tag1", "tag2"]
  }
]
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const result = await httpPost(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        console.log('  No response from AI');
        if (result.error) console.log(`  API Error: ${result.error.message}`);
        else console.log('  Raw API output:', JSON.stringify(result).substring(0, 500));
        return [];
    }

    try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const clips = JSON.parse(cleanText);
        return Array.isArray(clips) ? clips : [];
    } catch (e) {
        console.log(`  Parse error: ${e.message}`);
        return [];
    }
}

/**
 * Format single clip for display
 */
function formatClip(clip, videoTitle, videoUrl) {
    return `
============================================================
CLIP #${clip.clip_number} - "${clip.title}"
============================================================

Timestamp: ${clip.timestamp_start} - ${clip.timestamp_end}
Full Link: ${videoUrl}&t=${clip.timestamp_start.replace(':', 'm').replace('s', '')}

Description:
${clip.description}

Hook (first line):
"${clip.hook}"

Category: ${clip.category}
Spice Level: ${'🌶️'.repeat(Math.ceil((clip.spice_level || 5) / 2))} (${clip.spice_level || 5}/10)

Subtitle Suggestions: ${clip.subtitles?.join(' | ') || 'N/A'}

Suggested Caption: ${clip.caption}
Hashtags: ${(clip.hashtags || []).join(' ')}
`;
}

/**
 * Detect silence and return segments to KEEP (non-silent parts)
 */
async function getSilenceSegments(filePath, threshold = -35, duration = 0.8) {
    return new Promise((resolve) => {
        const cmd = `ffmpeg -i "${filePath}" -af "silencedetect=noise=${threshold}dB:d=${duration}" -f null -`;
        exec(cmd, (error, stdout, stderr) => {
            const output = stderr;
            const segments = [];
            const silences = [];
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.includes('silence_start:')) {
                    const m = line.match(/silence_start: ([\d.]+)/);
                    if (m) silences.push({ start: parseFloat(m[1]) });
                } else if (line.includes('silence_end:')) {
                    const m = line.match(/silence_end: ([\d.]+)/);
                    if (m && silences.length > 0) silences[silences.length - 1].end = parseFloat(m[1]);
                }
            }
            const durationMatch = output.match(/Duration: (\d+):(\d+):([\d.]+)/);
            let totalDur = 0;
            if (durationMatch) totalDur = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3]);
            if (silences.length === 0) return resolve([{ start: 0, end: totalDur || 3600 }]);
            let lastPos = 0;
            for (const s of silences) {
                if (s.start > lastPos + 0.1) segments.push({ start: Math.max(0, lastPos - 0.1), end: s.start + 0.1 });
                lastPos = s.end;
            }
            if (lastPos < totalDur) segments.push({ start: Math.max(0, lastPos - 0.1), end: totalDur });
            resolve(segments);
        });
    });
}

/**
 * Download a clip and convert to vertical 9:16 format
 */
async function downloadClip(videoId, clip, outputDir = './downloads', layout = 'center') {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const startTime = clip.timestamp_start.replace(':', 'm').replace('s', '') + 's';
        const endTime = clip.timestamp_end.replace(':', 'm').replace('s', '') + 's';
        const safeTitle = clip.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const tempFile = `${outputDir}/${safeTitle}_temp.mp4`;
        const outputFile = `${outputDir}/${safeTitle}.mp4`;
        let downloadCmd = `yt-dlp -f "best[height<=1080]" --download-sections "*${startTime}-${endTime}" --merge-output-format mp4 --extractor-args "youtube:player-client=android,web" --output "${tempFile}" "https://youtube.com/watch?v=${videoId}"`;
        if (fs.existsSync('cookies.txt')) {
            downloadCmd = downloadCmd.replace('yt-dlp', 'yt-dlp --cookies cookies.txt');
        }

        console.log(`\n⬇️  Downloading: ${clip.title} (${clip.timestamp_start} - ${clip.timestamp_end})`);
        exec(downloadCmd, { timeout: 180000 }, async (error) => {
            if (error) return reject(error);
            if (layout === 'original') return resolve(outputFile);

            console.log(`   🔄 Processing layout: ${layout}...`);
            let vFilter = '';
            let audioFilter = 'anull';
            const speed = 1.2;

            if (clip.viralMode) {
                const segments = await getSilenceSegments(tempFile);
                if (segments && segments.length > 1) {
                    const vFilters = segments.map(s => `between(t,${s.start},${s.end})`).join('+');
                    vFilter = `select='${vFilters}',setpts=N/FRAME_RATE/TB/${speed}`;
                    audioFilter = `aselect='${vFilters}',asetpts=N/SR/TB,atempo=${speed}`;
                } else {
                    vFilter = `setpts=PTS/${speed}`;
                    audioFilter = `atempo=${speed}`;
                }
            }

            let filterConfig = '';
            if (layout === 'split') {
                const base = vFilter ? ` [0:v]${vFilter},` : ' [0:v]';
                filterConfig = `-filter_complex "${base}split[s1][s2];[s1]crop=iw/2:ih:0:0,scale=1080:960[t];[s2]crop=iw/2:ih:iw/2:0,scale=1080:960[b];[t][b]vstack=inputs=2[v]" -map "[v]" -map 0:a`;
            } else if (layout === 'square') {
                let crop = 'crop=ih:ih'; // 1:1 aspect ratio square
                const finalV = [vFilter, crop, 'scale=1080:1080'].filter(f => f).join(',');
                filterConfig = `-vf "${finalV}"`;
            } else if (layout === 'letterbox') {
                // Shorts-Ready: 1:1 square crop (sees full desk) padded into 9:16 frame
                const finalV = [vFilter, 'crop=ih:ih', 'scale=1080:1080', 'pad=1080:1920:0:420:black'].filter(f => f).join(',');
                filterConfig = `-vf "${finalV}"`;
            } else {
                let crop = 'crop=ih*(9/16):ih'; // center default
                if (layout === 'left') crop = 'crop=ih*(9/16):ih:0:0';
                else if (layout === 'right') crop = 'crop=ih*(9/16):ih:iw-ow:0';
                const finalV = [vFilter, crop, 'scale=1080:1920:force_original_aspect_ratio=decrease', 'pad=1080:1920:(ow-iw)/2:(oh-ih)/2'].filter(f => f).join(',');
                filterConfig = `-vf "${finalV}"`;
            }

            const convertCmd = `ffmpeg -i "${tempFile}" ${filterConfig} -af "${audioFilter}" -c:v libx264 -preset fast -c:a aac -b:a 128k "${outputFile}" -y`;
            exec(convertCmd, { timeout: 120000 }, async (convError) => {
                try { fs.unlinkSync(tempFile); } catch (e) {}
                if (convError) {
                    console.log(`   ⚠️  Convert failed: ${convError.message}`);
                } else {
                    console.log(`   ✅ Video processed successfully!`);
                    const driveData = await uploadToDrive(outputFile, path.basename(outputFile));
                    if (driveData) {
                        await updateMetadataDB({
                            title: clip.title,
                            videoId,
                            originalUrl: `https://youtube.com/watch?v=${videoId}`,
                            driveLink: driveData.link,
                            duration: clip.duration_seconds,
                            layout: layout
                        });
                        try { fs.unlinkSync(outputFile); } catch (e) {}
                    }
                }
                resolve(outputFile);
            });
        });
    });
}

/**
 * Download all clips
 */
async function downloadAllClips(videoId, clips, layout = 'center') {
    console.log('\n📥 STARTING DOWNLOADS...');
    for (const clip of clips) {
        try { await downloadClip(videoId, clip, './downloads', layout); } catch (e) {
            console.log(`   ❌ Failed: ${clip.title} (${e.message})`);
        }
    }
}

/**
 * Save results to file
 */
function saveResults(results, videoId) {
    const filename = `viral_clips_${videoId}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\nSaved ${results.clips.length} clips to ${filename}`);

    // Also save markdown version
    let md = '# Viral Clips Extracted\n\n';
    md += `Video: ${results.videoTitle}\n`;
    md += `Total Clips Found: ${results.clips.length}\n\n`;
    md += results.clips.map((c, i) => `## Clip ${i + 1}: ${c.title}\n- **Time:** ${c.timestamp_start} - ${c.timestamp_end}\n- **Category:** ${c.category}\n`).join('\n');
    fs.writeFileSync(`viral_clips_${videoId}.md`, md);
}

/**
 * Main function
 */
/**
 * Main function
 */
async function processSingleVideo(url, layout, isViral, automationMode = true) {
    const videoId = extractVideoId(url);
    if (!videoId) { console.log('   ❌ Invalid YouTube URL'); return false; }

    console.log(`\n[1/3] Fetching video details...`);
    const videoData = await getVideoDetails(videoId);
    if (!videoData) { console.log('   ❌ Could not fetch video details'); return false; }
    console.log(`      Title: ${videoData.title}`);

    console.log('\n[2/3] Analyzing for 8-10 viral moments...');
    const transcript = await fetchTranscript(videoId);
    const description = await fetchDescription(videoId);
    const clips = await findViralClips(videoData, videoId, transcript, description);
    
    if (clips.length === 0) {
        console.log('\n   ⚠️  No viral clips found for this video.');
        return true; // Mark as done to move to next
    }

    const videoUrl = `https://youtube.com/watch?v=${videoId}`;
    saveResults({ videoTitle: videoData.title, videoUrl, clips }, videoId);

    console.log(`\n[3/3] Processing ${clips.length} clips...`);
    console.log(`      📐 Layout: ${layout} | 🔥 Viral: ${isViral ? 'YES' : 'NO'}`);
    
    clips.forEach(c => c.viralMode = isViral);
    await downloadAllClips(videoId, clips, layout);
    
    return true;
}

async function main() {
    const args = process.argv.slice(2);
    const isBatch = args.includes('--batch');
    const cliUrl = args.find(a => a.startsWith('http'));
    const cliLayout = args.find(a => !a.startsWith('--') && !a.startsWith('http')) || 'letterbox';
    const cliViral = args.includes('y');

    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (q) => new Promise((resolve) => rl.question(q, resolve));

    try {
        console.log('\n' + '='.repeat(60));
        if (isBatch) console.log('VIRAL CLIP ANALYZER - 🏢 BATCH PROCESSING MODE');
        else if (cliUrl) console.log('VIRAL CLIP ANALYZER - 🤖 AUTOMATION MODE');
        else console.log('VIRAL CLIP ANALYZER');
        console.log('='.repeat(60));

        if (isBatch) {
            if (!fs.existsSync('urls.txt')) {
                console.log('❌ urls.txt not found. Create it with YouTube URLs to start batch mode.');
                return;
            }
            const urls = fs.readFileSync('urls.txt', 'utf8').split('\n').map(u => u.trim()).filter(u => u && !u.startsWith('#'));
            console.log(`🚀 Found ${urls.length} videos to process...\n`);

            for (let i = 0; i < urls.length; i++) {
                console.log(`\n📦 PROCESSING VIDEO ${i + 1}/${urls.length}: ${urls[i]}`);
                const success = await processSingleVideo(urls[i], cliLayout, cliViral);
                
                if (success) {
                    // Update urls.txt to remove the finished URL
                    const remaining = urls.slice(i + 1);
                    fs.writeFileSync('urls.txt', remaining.join('\n'));
                }
            }
            console.log('\n🌟 ALL BATCH TASKS COMPLETE!');
        } else if (cliUrl) {
            await processSingleVideo(cliUrl, cliLayout, cliViral);
            console.log('\n✅ TASK COMPLETE!');
        } else {
            // --- INTERACTIVE MODE ---
            const url = await question('\nEnter YouTube URL: ');
            const videoId = extractVideoId(url);
            if (!videoId) { console.log('Invalid YouTube URL'); return; }

            console.log('\n[1/2] Fetching video details...');
            const videoData = await getVideoDetails(videoId);
            if (!videoData) { console.log('Could not fetch video details'); return; }
            console.log(`  Title: ${videoData.title}`);

            console.log('\n[2/2] Analyzing for 8-10 viral moments...');
            const transcript = await fetchTranscript(videoId);
            const description = await fetchDescription(videoId);
            const clips = await findViralClips(videoData, videoId, transcript, description);
            
            if (clips.length === 0) {
                console.log('\nNo viral clips found');
                return;
            }

            console.log(`\nFound ${clips.length} VIRAL CLIPS!`);
            console.log('='.repeat(60));
            for (const clip of clips) console.log(formatClip(clip, videoData.title, `https://youtube.com/watch?v=${videoId}`));

            const download = await question(`\n📥 Download? (clip number 1-${clips.length}, 'all', or 'n'): `);
            if (download.toLowerCase() !== 'n' && download.toLowerCase() !== 'no') {
                console.log('\nLayout: 1.Center, 2.Split, 3.Left, 4.Right, 5.Original, 6.Square(1:1), 7.Shorts-Ready(9:16 Letterbox)');
                const layoutChoice = await question('Choice (1-7): ');
                const layouts = ['center', 'split', 'left', 'right', 'original', 'square', 'letterbox'];
                const layout = layouts[parseInt(layoutChoice) - 1] || 'center';
                const viralMode = await question('🔥 Viral Speed (1.2x + Jumpcuts)? (y/n): ');
                const isViral = viralMode.toLowerCase().startsWith('y');

                let clipsToDownload = [];
                if (download.toLowerCase() === 'all') clipsToDownload = clips;
                else {
                    const n = parseInt(download);
                    if (!isNaN(n) && n >= 1 && n <= clips.length) clipsToDownload = [clips[n - 1]];
                }

                if (clipsToDownload.length > 0) {
                    clipsToDownload.forEach(c => c.viralMode = isViral);
                    await downloadAllClips(videoId, clipsToDownload, layout);
                }
            }
        }
    } catch (error) {
        console.error('\n   ❌ Error:', error.message);
    } finally {
        rl.close();
    }
}
        console.error('\nError:', error.message);
    } finally {
        rl.close();
    }
}

main();
