import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3-flash-preview';

const videoId = '3I482TBLEzc';

async function runTest() {
    console.log(`🚀 TESTING HOTSPOT DISCOVERY FOR: ${videoId}\n`);
    
    try {
        console.log('  🔍 Fetching Top Comments...');
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance&key=${YOUTUBE_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.items) {
           console.log('No comments found or API error:', data);
           return;
        }

        const comments = data.items.map(item => ({
            text: item.snippet.topLevelComment.snippet.textDisplay,
            likes: item.snippet.topLevelComment.snippet.likeCount
        }));

        console.log('  📊 Analyzing audience reaction...');
        const timestampMap = {};
        const hypeKeywords = ['😂', '🔥', 'legend', 'savage', 'insane', 'truth', 'wow', 'lmao', 'killed it'];
        let hypeCount = 0;

        comments.forEach(c => {
            const text = c.text.toLowerCase();
            const tsMatch = text.match(/\d{1,2}:\d{2}(:\d{2})?/g);
            if (tsMatch) {
                tsMatch.forEach(ts => {
                    timestampMap[ts] = (timestampMap[ts] || 0) + 1 + (c.likes > 10 ? 2 : 0);
                });
            }
            hypeKeywords.forEach(word => {
                if (text.includes(word)) hypeCount++;
            });
        });

        const topTimestamps = Object.entries(timestampMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(entry => entry[0]);

        const heatmap = `Timestamps Mentioned: ${topTimestamps.join(', ')} | Hype Count: ${hypeCount}`;

        console.log('\n--- HUMAN HEATMAP DISCOVERED ---');
        console.log(heatmap);
        console.log('--------------------------------\n');
        
        console.log('🤖 Sending to Gemini for "Comment-Guided" Clipping...\n');
        
        const prompt = `You are a viral content expert. Find 5 viral clips for video ${videoId}.
        Humans in comments are excited about: ${heatmap}.
        Return 5 specific viral themes/titles and WHY they match the audience interest. 
        Format as clear bullet points.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        const gResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const gData = await gResponse.json();
        if (!gData.candidates) {
            console.log('Gemini API Error or Safety Filtered:', JSON.stringify(gData, null, 2));
            return;
        }
        const aiText = gData.candidates[0].content.parts[0].text;

        console.log('--- AI RECOMMENDED CLIPS (GUIDED BY AUDIENCE) ---');
        console.log(aiText);
        
    } catch (e) {
        console.error('Test Failed:', e.message);
    }
}

runTest();
