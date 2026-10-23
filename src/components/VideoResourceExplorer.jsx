/**
 * Anti Gravity 2.0 - Verified YouTube Educational Video Resource Explorer
 * =======================================================================
 * Embeds pre-verified STEM video lectures using youtube-nocookie.com
 * Features:
 * - Sanitizes raw YouTube URLs to https://www.youtube-nocookie.com/embed/{ID}?rel=0&modestbranding=1
 * - Includes allowFullScreen and allow="accelerometer; autoplay; clipboard-write; encrypted-media"
 * - Category filtering (Physics, Computer Science, Chemistry, Biology)
 * - Custom URL input bar to paste and sanitize any educational video
 * - Auto-awards XP for watching educational videos
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";

/**
 * Sanitizes any raw YouTube URL (watch, youtu.be, embed, shorts)
 * into a safe, tracking-free youtube-nocookie embed URL.
 */
export function sanitizeYouTubeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();

  // If already a clean 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      id: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${trimmed}?rel=0&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${trimmed}`
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const allowedHosts = new Set([
    "youtube.com", "www.youtube.com", "m.youtube.com",
    "youtube-nocookie.com", "www.youtube-nocookie.com",
    "youtu.be", "www.youtu.be"
  ]);
  if (!allowedHosts.has(hostname) || !["https:", "http:"].includes(parsedUrl.protocol) || parsedUrl.port) return null;

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  let videoId = "";
  if (hostname.endsWith("youtu.be")) {
    videoId = pathParts[0] || "";
  } else if (parsedUrl.pathname === "/watch") {
    videoId = parsedUrl.searchParams.get("v") || "";
  } else if (["embed", "shorts", "live", "v"].includes(pathParts[0])) {
    videoId = pathParts[1] || "";
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  return {
    id: videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}

export const VERIFIED_EDUCATIONAL_VIDEOS = [
  {
    id: "WUvTyaaNkzM",
    title: "The Essence of Calculus",
    channel: "3Blue1Brown",
    subject: "Maths",
    duration: "17 min",
    level: "All Cohorts",
    summary: "An intuitive visual introduction to derivatives, integrals, and the fundamental theorem of calculus.",
    tags: ["Calculus", "Derivatives", "Integrals"]
  },
  {
    id: "Yf0BN0kq7OU",
    title: "Three Incorrect Laws of Motion",
    channel: "Veritasium",
    subject: "Physics",
    duration: "",
    level: "All Cohorts",
    summary: "An exploration of common intuitions about motion and how Newton's laws describe it more accurately.",
    tags: ["Forces", "Newton's Laws", "Motion"]
  },
  {
    id: "rL8X2mlNHPM",
    title: "Intro to Algorithms: Crash Course Computer Science #13",
    channel: "CrashCourse Computer Science",
    subject: "Computer Science",
    duration: "12 min",
    level: "Teen & Senior",
    summary: "How sorting and graph search algorithms solve everyday computational problems efficiently.",
    tags: ["Algorithms", "Data Structures", "Logic"]
  },
  {
    id: "bMknfKXIFA8",
    title: "React Course - Beginner's Tutorial for React JavaScript Library",
    channel: "freeCodeCamp.org",
    subject: "Computer Science",
    duration: "11.5 hr",
    level: "Senior",
    summary: "Build projects while learning React components, props, state, hooks, and application structure.",
    tags: ["React", "JavaScript", "Components"]
  },
  {
    id: "UL1jmJaUkaQ",
    title: "Stoichiometry - Chemistry for Massive Creatures: Crash Course Chemistry #6",
    channel: "CrashCourse",
    subject: "Chemistry & Biology",
    duration: "",
    level: "All Cohorts",
    summary: "Learn about moles, molar mass, balancing equations, and molar ratios.",
    tags: ["Stoichiometry", "Mole Concept", "Reactions"]
  }
];

export default function VideoResourceExplorer() {
  const { awardXP, showToast } = useApp();
  const [selectedVideo, setSelectedVideo] = useState(VERIFIED_EDUCATIONAL_VIDEOS[0]);
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [customError, setCustomError] = useState("");
  const [embedError, setEmbedError] = useState(false);
  const [watchedVideos, setWatchedVideos] = useState(new Set());

  const subjects = ["All", "Physics", "Maths", "Computer Science", "Chemistry & Biology"];

  const filteredVideos = VERIFIED_EDUCATIONAL_VIDEOS.filter(video => {
    const matchesSubject = subjectFilter === "All" || video.subject === subjectFilter;
    const matchesQuery = !searchQuery || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesQuery;
  });

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setEmbedError(false);

    if (!watchedVideos.has(video.id)) {
      setWatchedVideos(prev => new Set(prev).add(video.id));
      awardXP(15, `Started lecture: ${video.title.slice(0, 25)}`);
      showToast(`📺 +15 XP: Studying ${video.channel}!`);
    }
  };

  const handleAddCustomUrl = (e) => {
    e?.preventDefault();
    setCustomError("");

    const sanitized = sanitizeYouTubeUrl(customUrlInput);
    if (!sanitized) {
      setCustomError("Invalid YouTube URL. Please paste a valid YouTube watch, youtu.be, or embed link.");
      return;
    }

    const newVideo = {
      id: sanitized.id,
      title: `YouTube video (${sanitized.id})`,
      channel: "External YouTube Source",
      subject: "Custom Resource",
      duration: "",
      level: "All Cohorts",
      summary: "Embedded from the YouTube link you provided.",
      tags: ["Custom", "YouTube"]
    };

    setSelectedVideo(newVideo);
    setCustomUrlInput("");
    setEmbedError(false);
    awardXP(10, "Added custom educational video");
    showToast("✨ YouTube video embedded in privacy-enhanced mode!");
  };

  const video = selectedVideo;

  return (
    <div style={{ marginTop: "16px" }}>
      {/* Custom URL Input Bar */}
      <div className="card" style={{ padding: "14px", marginBottom: "16px", background: "var(--card)" }}>
        <b style={{ fontSize: "0.92rem", display: "block", marginBottom: "6px" }}>
          🔗 Paste Any YouTube URL to Sanitize &amp; Embed:
        </b>
        <form onSubmit={handleAddCustomUrl} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            value={customUrlInput}
            onChange={e => setCustomUrlInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ whiteSpace: "nowrap" }}>
            Embed Video
          </button>
        </form>
        {customError && <div className="warn" style={{ marginTop: "6px", fontSize: "12px" }}>⚠️ {customError}</div>}
      </div>

      {/* Active Video Player Stage */}
      <div className="card" style={{ padding: "16px", background: "var(--card)" }}>
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "14px", overflow: "hidden", background: "#000" }}>
          {!embedError ? (
            <iframe
              key={video.id}
              src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&playsinline=1`}
              title={video.title}
              referrerPolicy="strict-origin-when-cross-origin"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none"
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onError={() => setEmbedError(true)}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                padding: "20px",
                textAlign: "center"
              }}
            >
              <h3>⚠️ Embed Restricted</h3>
              <p className="mu" style={{ maxWidth: "400px", margin: "8px 0 16px" }}>
                This educational video has restricted iframe playback on some networks. You can open it directly:
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="chip"
                style={{ background: "var(--r)", color: "#fff", padding: "10px 20px", fontWeight: "bold" }}
              >
                ▶️ Watch Directly on YouTube
              </a>
            </div>
          )}
        </div>

        {/* Video Metadata & Tags */}
        <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem" }}>{selectedVideo.title}</h2>
            <div className="mu" style={{ fontSize: "0.85rem" }}>
              <b>{selectedVideo.channel}</b>{selectedVideo.duration ? ` · ${selectedVideo.duration}` : ""} · <span style={{ color: "var(--ac2)" }}>{selectedVideo.level}</span>
            </div>
            <p style={{ margin: "8px 0 12px 0", fontSize: "0.92rem", lineHeight: "1.5" }}>
              {selectedVideo.summary}
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {selectedVideo.tags?.map(t => (
                <span key={t} className="chip" style={{ fontSize: "11px", padding: "3px 8px" }}>
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <a
              href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="alt"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "9999px",
                textDecoration: "none",
                fontSize: "12px",
                border: "1px solid var(--bd)"
              }}
            >
              🔗 Open in YouTube
            </a>
          </div>
        </div>
      </div>

      {/* Filter and Video Playlist Rail */}
      <h3 style={{ marginTop: "24px", marginBottom: "10px" }}>Curated Video Archive</h3>
      
      {/* Category Filter Chips & Search Bar */}
      <div className="row" style={{ gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
        <input
          type="text"
          placeholder="🔍 Search lectures by topic or formula…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: "200px" }}
        />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {subjects.map(s => (
            <button
              key={s}
              className="chip"
              style={{
                borderColor: subjectFilter === s ? "var(--ac2)" : undefined,
                background: subjectFilter === s ? "rgba(168, 85, 247, 0.15)" : undefined,
                color: subjectFilter === s ? "var(--ac2)" : undefined
              }}
              onClick={() => setSubjectFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {filteredVideos.map(video => {
          const isCurrent = video.id === selectedVideo.id;
          return (
            <div
              key={video.id}
              className="card"
              onClick={() => handleSelectVideo(video)}
              style={{
                cursor: "pointer",
                borderColor: isCurrent ? "var(--ac2)" : undefined,
                background: isCurrent ? "rgba(168, 85, 247, 0.08)" : undefined,
                transition: "all 0.2s ease",
                transform: isCurrent ? "scale(1.01)" : undefined
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span className="badge" style={{ fontSize: "11px", background: "rgba(99, 102, 241, 0.15)", color: "var(--ac2)" }}>
                  {video.subject}
                </span>
                {video.duration && <span className="mu" style={{ fontSize: "11px" }}>{video.duration}</span>}
              </div>
              <b style={{ fontSize: "0.95rem", display: "block", marginBottom: "4px" }}>
                {video.title}
              </b>
              <div className="mu" style={{ fontSize: "12px", marginBottom: "8px" }}>
                {video.channel}
              </div>
              <p className="mu" style={{ fontSize: "12px", margin: 0, lineHeight: "1.4" }}>
                {video.summary.slice(0, 90)}…
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
