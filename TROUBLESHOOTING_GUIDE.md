# 🛡️ Viral Clip Analyzer - Master Troubleshooting Guide

This document archives the critical bugs we identified, why they were completely ruining the video outputs, and exactly how we fixed them. If your application ever goes rogue, resets, or if you need to build this app again from scratch, use this exact guide to instantly restore premium functionality.

---

## 🛑 BUG 1: The "Everything Freezes / CPU Crash" & File Lock Errors
**The Problem:** The app was trying to download, process, and upload 8-10 viral clips *simultaneously*. This caused Windows to lock the files (`EBUSY: resource busy or locked` errors) because Google Drive was still reading the files while FFmpeg tried to delete them. The CPU maxed out at 100% and crashed the process.
**The Fix:**
- **Sequential Flow:** Refactored the architecture from a parallel `Promise.all()` to a strict sequential `for...of` loop. The script now processes strictly one-by-one: Download ➡️ Render ➡️ Google Drive Upload ➡️ Delete.
- **Delayed Cleanup:** Implemented a safe 5-second `setTimeout` before firing `fs.unlinkSync()`. This guarantees the Google Drive API completely lets go of the file before Node.js attempts to purge it from your disk.

## 🛑 BUG 2: Highly Pixelated, Garbage 360p Video Quality
**The Problem:** The final MP4 looked like muddy, unwatchable trash. This happened because `yt-dlp`'s default `best[height<=1080]` parameter cuts corners. To save bandwidth, YouTube feeds it heavily compressed 360p or 720p merged streams instead of true 1080p.
**The Fix:**
- **Raw Track Extraction:** We reprogrammed the `yt-dlp` hook in `analyzer.js` to rigidly demand: `bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]`. This forcefully strips the raw, uncompressed 1080p High-Definition video track and flawless audio track directly from YouTube servers and stitches them locally.
- **Enforced High-Bitrate:** Added `-b:v 3000k -maxrate 3500k -bufsize 7000k` directly to the FFmpeg rendering command, cementing the output into a premium quality professional bracket that algorithms favor.

## 🛑 BUG 3: The Empty / Corrupted Output File (48 Bytes)
**The Problem:** The script would confidently claim "Video Processed Successfully" but the MP4 file in your `downloads/` folder was 0MB and could not be played.
**The Fix:**
- **FFmpeg Timeout Limit:** Node.js's `exec()` function had a strict hardcoded timeout of 120 seconds (`120000ms`). Upgrading the video quality and layout drastically increased the CPU load, causing the script to secretly assassinate the background FFmpeg process for "taking too long." We increased this timeout limit to `300000ms` (5 full minutes) to allow seamless HD processing without false errors.

## 🛑 BUG 4: The Ugly "Black Bars / Floating Square" Layout
**The Problem:** The "Shorts-Ready Letterbox" setting was outputting an unwatchable tiny 16:9 box sitting in a massive sea of completely black empty space. This layout guarantees instant swipe-aways on TikTok and Reels. 
**The Fix:**
- **The Premium Blurred-Background Layout:** Re-wrote the actual FFmpeg video mapping logic into an advanced `-filter_complex` tree.
- Instead of using a simple `pad` command, the app now physically splits the video into two layers. It places the razor-sharp video dynamically dead-center on the screen. It then takes a duplicate of that video, heavily stretches it, artificially blurs it (`boxblur=20:20`), and paints it underneath your video to flawlessly fill 100% of the screen.

---

### In Code: The Magic FFmpeg Premium Format String
If you ever lose the perfect visual layout engine inside `analyzer.js`, search the script for `layout === 'letterbox'` and replace it with this gold-standard code block:

```javascript
} else if (layout === 'letterbox') {
    // PREMIUM SHORTS FORMAT: Keeps original sharp 16:9 video in the middle, fills the empty vertical space with a heavily blurred & stretched background of the video
    const base = vFilter ? ` [0:v]${vFilter},` : ' [0:v]';
    filterConfig = `-filter_complex "${base}split[v1][v2];[v1]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:20[bg];[v2]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]" -map "[outv]" -map 0:a`;
}
```
