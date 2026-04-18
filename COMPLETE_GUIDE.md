# 🔥 Viral Clip Extractor - Complete Guide

## What This Tool Does

1. **Finds ALL viral clips** from long YouTube videos (podcasts, interviews, streams)
2. **Gen Z optimized** - finds spicy, drama, funny, controversial moments
3. **Downloads as vertical 9:16** (1080x1920) - ready for Reels/Shorts/TikTok
4. **Complete topics** - 40-70 seconds each with beginning + ending

---

## 📁 File Structure

```
viral-clip-analyzer/
├── analyzer.js          # Main tool (Node.js)
├── README.md            # Quick start guide
├── COMPLETE_GUIDE.md    # This file - full documentation
├── downloads/           # Horizontal clips (1920x1080)
└── downloads_vertical/  # Vertical clips (1080x1920)
```

---

## 🛠️ Setup (One Time)

### 1. Install Node.js
Download from: https://nodejs.org/

### 2. Install yt-dlp (for downloading)
```bash
# Windows - using winget
winget install yt-dlp

# Or using chocolatey
choco install yt-dlp

# Or download .exe directly
# https://github.com/yt-dlp/yt-dlp/releases
# Save to C:\Windows\ or add to PATH
```

### 3. Install FFmpeg (for vertical conversion)
```bash
# Windows - using winget
winget install ffmpeg

# Or using chocolatey
choco install ffmpeg

# Or download from:
# https://www.gyan.dev/ffmpeg/builds/
# Add bin folder to PATH
```

### 4. Verify Installation
```bash
node --version
yt-dlp --version
ffmpeg -version
```

---

## 🚀 How to Use

### Quick Start
```bash
cd C:\Users\popat\OneDrive\Desktop\jmm\viral-clip-analyzer
node analyzer.js
```

### Step-by-Step Flow

1. **Enter YouTube URL**
   ```
   Enter YouTube URL: https://youtu.be/sX6gEwH-SA4
   ```

2. **AI Analyzes Video**
   - Fetches video metadata
   - Finds ALL viral moments (6-8 clips typically)
   - Each clip has: timestamp, hook, description, spice level

3. **Review Clips**
   ```
   CLIP #1 - "Why You Are Distracted by Girls"
   Timestamp: 05:12 - 06:18
   Spice Level: 🌶️🌶️🌶️🌶️🌶️ (9/10)
   Hook: "Ladki ka attraction prem nahi hai..."
   ```

4. **Download All Clips**
   ```
   📥 Download all clips? (y/n): y
   ```

5. **Files Saved**
   - `downloads_vertical/` - Vertical 9:16 (1080x1920) for Reels/Shorts
   - `viral_clips_{videoId}.json` - Full clip data
   - `viral_clips_{videoId}.md` - Readable summary

---

## 🎬 Vertical Video Format (IMPORTANT!)

The tool converts clips to **vertical 9:16 format**:

### Specifications
- **Resolution:** 1080x1920 (Full HD vertical)
- **Aspect Ratio:** 9:16 (mobile-first)
- **Crop:** Center crop from 1920x1080
- **Codec:** H.264 + AAC audio
- **Bitrate:** ~2500-3500 kbps

### FFmpeg Command Used
```bash
ffmpeg -i "input_temp.mp4" \
  -vf "crop=ih*(9/16):ih,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset fast \
  -c:a aac -b:a 128k \
  "output_vertical.mp4"
```

### Why This Format?
- ✅ Instagram Reels (1080x1920)
- ✅ TikTok (1080x1920)
- ✅ YouTube Shorts (1080x1920)
- ✅ Snapchat Spotlight (1080x1920)

---

## 🔧 How It Works (Technical Flow)

### 1. Fetch Video Info (YouTube API)
```javascript
GET https://www.googleapis.com/youtube/v3/videos
  ?part=snippet,statistics,contentDetails
  &id={videoId}
  &key={YOUTUBE_API_KEY}
```

### 2. AI Analysis (Gemini API)
```javascript
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
  ?key={GEMINI_API_KEY}

Body: {
  "contents": [{
    "parts": [{ "text": PROMPT }]
  }],
  "generationConfig": {
    "temperature": 0.8,
    "maxOutputTokens": 4096
  }
}
```

**AI Prompt asks for:**
- ALL viral clips (no limit)
- 40-70 seconds each
- Complete topics with beginning + ending
- Categories: SPICY, DRAMA, FUNNY, CONTROVERSY, MONEY, MOTIVATION
- Spice level 1-10

### 3. Download Clips (yt-dlp)
```javascript
yt-dlp -f "best[height<=1080]" \
  --download-sections "*{startTime}-{endTime}" \
  --merge-output-format mp4 \
  --output "{outputFile}" \
  "https://youtube.com/watch?v={videoId}"
```

### 4. Convert to Vertical (FFmpeg)
```javascript
ffmpeg -i "temp.mp4" \
  -vf "crop=ih*(9/16):ih,scale=1080:1920..." \
  -c:v libx264 -preset fast \
  -c:a aac -b:a 128k \
  "vertical.mp4"
```

---

## 📊 API Keys Used

| API | Key | Purpose |
|-----|-----|---------|
| YouTube Data API v3 | `YOUR_YOUTUBE_API_KEY` | Fetch video metadata |
| Gemini API | `YOUR_GEMINI_API_KEY` | AI clip analysis |

**Model:** `gemini-3-flash-preview`

---

## 🎯 What Content Works Best

### High Viral Potential:
- ✅ Podcasts with hot takes
- ✅ Interview drama/controversy
- ✅ Comedy roasts
- ✅ Relationship advice
- ✅ Money/career reality checks
- ✅ Political commentary
- ✅ Motivational speeches

### Example Videos:
- Raj Shamani Podcast
- Ranveer Allahbadia (BeerBiceps)
- Khan Sir lectures
- Stand-up comedy specials
- Celebrity interviews

---

## 📝 Output Format

Each clip includes:

```json
{
  "clip_number": 1,
  "timestamp_start": "05:12",
  "timestamp_end": "06:18",
  "duration_seconds": 66,
  "title": "Catchy Clickbaity Title",
  "description": "What happens in this clip",
  "hook": "Exact opening line",
  "payoff": "How topic concludes",
  "category": "SPICY",
  "spice_level": 9,
  "subtitles": ["bold text 1", "bold text 2"],
  "caption": "Scroll-stopping caption with emojis",
  "hashtags": ["tag1", "tag2", "tag3"]
}
```

---

## ⚠️ Common Issues & Fixes

### 1. "yt-dlp not found"
```bash
# Install yt-dlp
winget install yt-dlp
# Or download .exe and add to PATH
```

### 2. "ffmpeg not found"
```bash
# Install ffmpeg
winget install ffmpeg
# Or download and add bin to PATH
```

### 3. "No clips found"
- Try a different video (podcast/interview works best)
- Video should be 10+ minutes long
- Video should have engaging content

### 4. "Vertical conversion failed"
- Clip still downloads in horizontal format
- Can crop manually in CapCut later

### 5. "Download timeout"
- Increase timeout in code (default: 180000ms = 3 min)
- Check internet connection

---

## 🎨 Post-Processing Tips

### For Instagram Reels:
1. Export from tool (1080x1920)
2. Add auto-captions in CapCut
3. Add trending audio
4. Post with 5-10 hashtags

### For YouTube Shorts:
1. Use vertical MP4 from tool
2. Add text overlay
3. Keep under 60 seconds
4. Add #Shorts in title

### For TikTok:
1. Vertical MP4 ready
2. Add trending sound
3. Use TikTok's native captions
4. Post at peak hours (6-9 PM)

---

## 💡 Pro Tips

1. **Batch Process:** Run tool on 5-10 videos at once
2. **Best Timestamp:** First 3 seconds must hook viewers
3. **Spice Level 8+:** These clips perform best
4. **Controversy > Education:** Drama gets more views
5. **Subtitles:** Add bold text for silent viewers

---

## 📈 Content Categories (Priority Order)

1. 🌶️ **SPICY/DRAMA** - Relationship, dating, breakup (Gen Z loves)
2. 🔥 **CONTROVERSY** - Hot takes, unpopular opinions
3. 😂 **FUNNY** - Roasts, comebacks, savage replies
4. 💰 **MONEY** - Get rich, side hustles, salary talks
5. 🎯 **LIFE ADVICE** - Hard truths, reality checks
6. 🤯 **SHOCKING** - Confessions, secrets, tea
7. 💪 **MOTIVATION** - Sigma grindset, comeback stories

---

## 🔐 API Key Notes

- Keys are pre-configured in `analyzer.js`
- Gemini API: Free tier available
- YouTube API: 10,000 units/day quota

---

## 📞 Quick Commands

```bash
# Run tool
node analyzer.js

# Test single clip download
node -e "require('./analyzer.js').downloadClip('VIDEO_ID', {title:'Test',timestamp_start:'0:00',timestamp_end:'0:30'}, './downloads', true)"

# Check downloaded files
ls -la downloads_vertical/
```

---

## ✅ Checklist for Next Time

- [ ] Node.js installed
- [ ] yt-dlp installed
- [ ] ffmpeg installed
- [ ] API keys in `analyzer.js`
- [ ] Run: `node analyzer.js`
- [ ] Paste YouTube URL
- [ ] Review clips
- [ ] Download all (y/n)
- [ ] Check `downloads_vertical/` folder
- [ ] Edit in CapCut (add captions, music)
- [ ] Post to Reels/Shorts/TikTok

---

**Built for:** Gen Z content creators, clip channels, viral pages

**Time per video:** ~5-10 minutes (analysis + download)

**Output:** 6-8 vertical clips ready to post

---

## 🚀 Future Improvements

- [ ] Auto-upload to Instagram/TikTok
- [ ] Auto-generate captions
- [ ] Face detection for smarter cropping
- [ ] Batch process multiple URLs
- [ ] Clip quality scoring

---

**Last Updated:** April 2026
**Version:** 1.0
