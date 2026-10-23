/**
 * People & Chat - People Directory Tab (PeopleDirectoryTab.jsx)
 * ==============================================================
 * Searchable list of visible student profiles.
 * Features:
 * - Search by name, class, or target exam.
 * - Quick category filters.
 * - 1-click "Message" button that initiates or opens a private chat.
 */

import React, { useState, useEffect } from "react";
import { getVisiblePeople } from "./chatService";

export default function PeopleDirectoryTab({ dbHandle, uid, onStartChat }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const loadPeople = async () => {
    if (!dbHandle) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getVisiblePeople(dbHandle, uid);
      setPeople(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeople();
  }, [dbHandle, uid]);

  const filteredPeople = people.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (p.name || "").toLowerCase().includes(q);
    const classMatch = (p.classOrExam || "").toLowerCase().includes(q);
    const bioMatch = (p.bio || "").toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || classMatch || bioMatch;

    let matchesCategory = true;
    if (categoryFilter === "School") {
      matchesCategory = (p.classOrExam || "").toLowerCase().includes("class");
    } else if (categoryFilter === "Competition") {
      matchesCategory = !(p.classOrExam || "").toLowerCase().includes("class");
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Search Bar & Refresh */}
      <div className="row" style={{ marginTop: "12px" }}>
        <input
          type="text"
          placeholder="🔍 Search students by name, exam (JEE, NEET), or class…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="alt" onClick={loadPeople}>↻ Refresh</button>
      </div>

      {/* Filter Chips */}
      <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
        {["All", "School", "Competition"].map(cat => (
          <button
            key={cat}
            className="chip"
            style={{ borderColor: categoryFilter === cat ? "var(--ac2)" : undefined }}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat === "All" ? "🌐 All Students" : cat === "School" ? "🎒 School (6-12)" : "🏆 Competitive Exams"}
          </button>
        ))}
      </div>

      {/* People Grid */}
      <div style={{ marginTop: "16px" }}>
        {loading ? (
          <div className="card mu">Loading student directory…</div>
        ) : !filteredPeople.length ? (
          <div className="card mu">
            {searchQuery
              ? "No students found matching your search."
              : "No other students have opted into the public directory yet. Be the first to share your profile!"}
          </div>
        ) : (
          <div className="grid">
            {filteredPeople.map(person => (
              <div
                key={person.uid}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span
                      style={{
                        fontSize: "26px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: "var(--in)",
                        border: "1px solid var(--bd)"
                      }}
                    >
                      {person.avatar || "🎓"}
                    </span>
                    <div>
                      <b style={{ fontSize: "16px", display: "block" }}>{person.name || "Student"}</b>
                      <span className="mu" style={{ fontSize: "12px" }}>{person.classOrExam || "EduNerd Learner"}</span>
                    </div>
                  </div>

                  {person.bio && (
                    <p style={{ fontSize: "13px", color: "var(--tx)", whiteSpace: "pre-wrap", margin: "4px 0" }}>
                      "{person.bio}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onStartChat(person)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    marginTop: "8px"
                  }}
                >
                  💬 Message
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
