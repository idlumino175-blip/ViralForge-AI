"""
Viral Clip Analyzer - Uses Gemini AI to analyze YouTube videos for viral short-form content
"""

import os
import json
import requests
from typing import Optional

# API Keys
GEMINI_API_KEY = "AIzaSyA8Ea3afTTImNSGGDXp6SvvWUTGsawK69A"
YOUTUBE_API_KEY = "AIzaSyDQK-OOvtJa9p3V86mDSrgzPFrTmVKOLDE"

GEMINI_MODEL = "gemini-2.0-flash-exp"


def search_youtube_videos(query: str, max_results: int = 10) -> list:
    """Search YouTube for videos matching the query"""
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "videoDuration": "short",  # Short videos under 4 min
        "maxResults": max_results,
        "key": YOUTUBE_API_KEY,
        "order": "relevance"
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    videos = []
    for item in data.get("items", []):
        video_id = item["id"]["videoId"]
        videos.append({
            "video_id": video_id,
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "thumbnail": item["snippet"]["thumbnails"]["high"]["url"],
            "channel": item["snippet"]["channelTitle"]
        })

    return videos


def get_video_details(video_id: str) -> dict:
    """Get detailed video statistics"""
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {
        "part": "snippet,statistics,contentDetails",
        "id": video_id,
        "key": YOUTUBE_API_KEY
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    if data.get("items"):
        item = data["items"][0]
        return {
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "duration": item["contentDetails"]["duration"],
            "view_count": int(item["statistics"].get("viewCount", 0)),
            "like_count": int(item["statistics"].get("likeCount", 0)),
            "comment_count": int(item["statistics"].get("commentCount", 0))
        }
    return {}


def fetch_transcript(video_id: str) -> str:
    """
    Fetch video transcript using YouTube's transcript API
    Note: This is a simplified approach - may need adjustment for production
    """
    # YouTube doesn't have an official transcript API in v3
    # We'll use a workaround or skip if unavailable
    return "[Transcript not available - analyzing from metadata]"


def analyze_with_gemini(video_data: dict, transcript: str) -> dict:
    """Use Gemini AI to analyze video for viral potential"""

    prompt = f"""
You are a viral content analyst specializing in short-form video content (Reels, Shorts, TikTok).

Analyze this YouTube video for viral clip potential:

VIDEO DATA:
- Title: {video_data.get('title', 'N/A')}
- Description: {video_data.get('description', 'N/A')[:500]}
- Views: {video_data.get('view_count', 0):,}
- Likes: {video_data.get('like_count', 0):,}
- Comments: {video_data.get('comment_count', 0):,}
- Duration: {video_data.get('duration', 'N/A')}

TRANSCRIPT/CONTEXT:
{transcript[:2000] if transcript else "No transcript available"}

Provide analysis in this EXACT JSON format:
{{
    "video_title": "Generated catchy title",
    "source_link": "https://youtube.com/watch?v=VIDEO_ID",
    "timestamp_range": "0:00-0:30 or best viral segment",
    "clip_description": "What happens in this clip",
    "hook": "The first line that grabs attention",
    "viral_analysis": {{
        "first_few_seconds": "Why the opening hooks viewers",
        "key_moment": "The turning point or climax",
        "why_watch_till_end": "What keeps viewers engaged"
    }},
    "editing_suggestions": {{
        "trim_notes": "How to trim for max retention",
        "pacing": "Pacing recommendations",
        "subtitles": ["Short subtitle suggestion 1", "Short subtitle suggestion 2"],
        "zoom_cuts": ["Moment for zoom 1", "Moment for zoom 2"],
        "music_style": "Recommended background music style"
    }},
    "suggested_caption": "Scroll-stopping caption for social",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}}

Respond with ONLY valid JSON, no markdown formatting.
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048
        }
    }

    response = requests.post(f"{url}?key={GEMINI_API_KEY}", headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    try:
        result_text = data["candidates"][0]["content"]["parts"][0]["text"]
        # Clean up markdown code blocks if present
        result_text = result_text.replace("```json", "").replace("```", "").strip()
        return json.loads(result_text)
    except (json.JSONDecodeError, KeyError) as e:
        return {"error": f"Failed to parse Gemini response: {e}", "raw_response": data}


def analyze_video(youtube_url: str) -> dict:
    """Main function to analyze a single YouTube video"""
    # Extract video ID from URL
    if "watch?v=" in youtube_url:
        video_id = youtube_url.split("watch?v=")[1].split("&")[0]
    elif "youtu.be/" in youtube_url:
        video_id = youtube_url.split("youtu.be/")[1].split("?")[0]
    else:
        return {"error": "Invalid YouTube URL"}

    print(f"Analyzing video: {video_id}")

    # Get video details
    video_data = get_video_details(video_id)
    video_data["video_id"] = video_id

    # Fetch transcript (if available)
    transcript = fetch_transcript(video_id)

    # Analyze with Gemini
    analysis = analyze_with_gemini(video_data, transcript)

    return analysis


def search_and_analyze(query: str, max_videos: int = 5) -> list:
    """Search YouTube and analyze multiple videos"""
    print(f"Searching for: {query}")
    videos = search_youtube_videos(query, max_videos)

    results = []
    for video in videos:
        print(f"  Analyzing: {video['title'][:50]}...")
        video_url = f"https://youtube.com/watch?v={video['video_id']}"
        analysis = analyze_video(video_url)
        if "error" not in analysis:
            results.append(analysis)

    return results


def format_output(analysis: dict) -> str:
    """Format analysis results for display"""
    output = f"""
{'='*60}
VIDEO ANALYSIS
{'='*60}

Video Title: {analysis.get('video_title', 'N/A')}
Source YouTube Link: {analysis.get('source_link', 'N/A')}
Timestamp Range: {analysis.get('timestamp_range', 'N/A')}

Clip Description:
{analysis.get('clip_description', 'N/A')}

Hook (first line):
"{analysis.get('hook', 'N/A')}"

Viral Analysis:
  - First Few Seconds: {analysis.get('viral_analysis', {}).get('first_few_seconds', 'N/A')}
  - Key Moment: {analysis.get('viral_analysis', {}).get('key_moment', 'N/A')}
  - Why Watch Till End: {analysis.get('viral_analysis', {}).get('why_watch_till_end', 'N/A')}

Editing Suggestions:
  - Trim Notes: {analysis.get('editing_suggestions', {}).get('trim_notes', 'N/A')}
  - Pacing: {analysis.get('editing_suggestions', {}).get('pacing', 'N/A')}
  - Subtitles: {', '.join(analysis.get('editing_suggestions', {}).get('subtitles', []))}
  - Zoom Cuts: {', '.join(analysis.get('editing_suggestions', {}).get('zoom_cuts', []))}
  - Music Style: {analysis.get('editing_suggestions', {}).get('music_style', 'N/A')}

Suggested Caption: {analysis.get('suggested_caption', 'N/A')}
Hashtags: {' '.join(analysis.get('hashtags', []))}

{'='*60}
"""
    return output


def save_results(results: list, filename: str = "viral_analysis_results.json"):
    """Save results to JSON file"""
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Results saved to {filename}")


def main():
    """Main entry point"""
    print("="*60)
    print("VIRAL CLIP ANALYZER")
    print("Powered by Gemini 2.0 Flash + YouTube Data API")
    print("="*60)

    # Get user input
    print("\nChoose mode:")
    print("1. Analyze a single YouTube URL")
    print("2. Search and analyze multiple videos")

    choice = input("\nEnter choice (1 or 2): ").strip()

    if choice == "1":
        url = input("Enter YouTube URL: ").strip()
        analysis = analyze_video(url)
        if "error" in analysis:
            print(f"Error: {analysis['error']}")
        else:
            print(format_output(analysis))
            save_results([analysis])

    elif choice == "2":
        query = input("Enter search query: ").strip()
        max_videos = int(input("Number of videos to analyze (1-10): ").strip() or "5")
        results = search_and_analyze(query, min(max_videos, 10))

        if results:
            print(f"\n{'='*60}")
            print(f"ANALYZED {len(results)} VIDEOS")
            print("="*60)
            for result in results:
                print(format_output(result))
            save_results(results)
        else:
            print("No results to display")

    else:
        print("Invalid choice")


if __name__ == "__main__":
    main()
