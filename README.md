# 🔥 Viral Clip Extractor + Downloader

AI-powered tool that finds **ALL viral clips** from long YouTube videos and optionally downloads them.

## Features

- **AI Analysis**: Uses Gemini 3 Flash to find every viral moment
- **Gen Z Optimized**: Prioritizes spicy, controversial, funny, drama content
- **Auto-Download**: Optionally download all clips as MP4 files
- **Ready to Post**: Includes captions, hashtags, subtitle suggestions

## What It Finds

🌶️ **SPICY/DRAMA**: Relationship talks, dating advice, breakup stories, love triangles
🔥 **CONTROVERSY**: Hot takes, unpopular opinions, political rants, religion debates
😂 **FUNNY**: Roasts, comebacks, jokes, awkward moments, savage replies
💰 **MONEY**: Get rich advice, side hustles, salary talks, job market reality
🎯 **LIFE ADVICE**: Hard truths, reality checks, generational gaps, parent conflicts
🤯 **SHOCKING**: Confessions, secrets revealed, tea/spilling, expose moments
💪 **MOTIVATION**: Aggressive motivation, sigma grindset, alpha mindset

## Setup

### 1. Install Dependencies

```bash
# Node.js is required
npm install --no-save yt-dlp
```

### 2. Install yt-dlp (for downloading)

**Windows:**
```bash
# Using chocolatey
choco install yt-dlp

# Or download directly
# https://github.com/yt-dlp/yt-dlp/releases/download/2024/yt-dlp.exe
```

**Alternative (Python):**
```bash
pip install yt-dlp
```

## Usage

### Run the Tool

```bash
node analyzer.js
```

### Enter a YouTube URL

```
🔥 VIRAL CLIP EXTRACTOR + DOWNLOADER 🔥

Enter YouTube URL: https://youtu.be/sX6gEwH-SA4
```

### Output

The tool will:
1. Fetch video info
2. AI analyzes for ALL viral clips
3. Display each clip with:
   - Timestamp range
   - Hook line
   - Spice level (1-10)
   - Category (DRAMA/FUNNY/CONTROVERSY/etc)
   - Caption & hashtags
4. Ask if you want to download

### Download Clips

```
📥 Download all clips? (y/n): y

⬇️  Downloading: Khan Sir Roasts Gen Z Love
   From: 24m15s To: 25m45s
   ✅ Saved: ./downloads/Khan_Sir_Roasts_Gen_Z.mp4
```

## Output Files

- `viral_clips_{videoId}.json` - Full clip data
- `viral_clips_{videoId}.md` - Readable summary
- `./downloads/` - Downloaded MP4 files (if chosen)

## Example Output

```
============================================================
CLIP #1 - "Khan Sir Roasts Gen Z 'Nibba-Nibbi' Love 💀"
============================================================

Timestamp: 24:15 - 25:45
Hook: "Ladki ke peeche bhagoge to na ladki milegi na career!"

Category: DRAMA
Spice Level: 🌶️🌶️🌶️🌶️🌶️ (9/10)

Subtitle Suggestions: Career first, Love later | Don't be a Majnu

Suggested Caption: Khan Sir choosing violence against lovers today! 😂
Hashtags: #KhanSir #SigmaMindset #RelationshipAdvice
```

## API Keys

Pre-configured in the code:
- **Gemini API**: `YOUR_GEMINI_API_KEY`
- **YouTube API**: `YOUR_YOUTUBE_API_KEY`

## Troubleshooting

### "yt-dlp not found"
Install yt-dlp:
```bash
# Windows (PowerShell as Admin)
winget install yt-dlp

# Or download .exe and add to PATH
```

### "JSON parse error"
The AI sometimes returns malformed JSON. Try running again.

### "No clips found"
The video might not have engaging content. Try a different video.

## License

MIT
