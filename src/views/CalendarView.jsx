/**
 * EduNerd - Calendar & Schedule View
 * ==================================
 * Interactive monthly schedule planner:
 * - Month navigation
 * - Event indicators on dates
 * - Add/delete study goals for any selected day
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { formatYMD } from "../utils/helpers";

export default function CalendarView() {
  const { progress, saveProgress, showToast } = useApp();

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(() => formatYMD(now));
  const [newPlanInput, setNewPlanInput] = useState("");

  const todayStr = formatYMD(now);
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleAddPlan = () => {
    const trimmed = newPlanInput.trim();
    if (!trimmed) return;

    const existingEvents = { ...(progress.ev || {}) };
    const dateList = existingEvents[selectedDate] || [];
    existingEvents[selectedDate] = [...dateList, trimmed.slice(0, 60)];

    saveProgress({ ev: existingEvents });
    setNewPlanInput("");
    showToast("Schedule updated ✓");
  };

  const handleDeletePlan = idx => {
    const existingEvents = { ...(progress.ev || {}) };
    const dateList = existingEvents[selectedDate] || [];
    const updated = dateList.filter((_, i) => i !== idx);

    if (updated.length) {
      existingEvents[selectedDate] = updated;
    } else {
      delete existingEvents[selectedDate];
    }

    saveProgress({ ev: existingEvents });
  };

  const selectedPlans = (progress.ev && progress.ev[selectedDate]) || [];

  return (
    <div className="pg">
      <h1>Calendar</h1>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "10px" }}>
          <button className="alt" onClick={handlePrevMonth}>‹</button>
          <b>
            {new Date(calendarYear, calendarMonth, 1).toLocaleString("default", { month: "long" })} {calendarYear}
          </b>
          <button className="alt" onClick={handleNextMonth}>›</button>
        </div>

        <div className="cal">
          {["S", "M", "T", "W", "T", "F", "S"].map(d => (
            <b key={d}>{d}</b>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <i key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = `${calendarYear}-${calendarMonth + 1}-${dayNum}`;
            const isSelected = dateKey === selectedDate;
            const hasEvents = progress.ev && progress.ev[dateKey];
            const isToday = dateKey === todayStr;

            let dayClass = "day";
            if (isSelected) dayClass += " sel";
            if (hasEvents) dayClass += " has";
            if (isToday) dayClass += " td";

            return (
              <button
                key={dateKey}
                className={dayClass}
                onClick={() => setSelectedDate(dateKey)}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <b>Plans for {selectedDate}</b>
        {selectedPlans.length > 0 ? (
          selectedPlans.map((plan, idx) => (
            <div
              key={idx}
              className="row"
              style={{ justifyContent: "space-between", marginTop: "8px" }}
            >
              <span>• {plan}</span>
              <button className="alt" onClick={() => handleDeletePlan(idx)}>✕</button>
            </div>
          ))
        ) : (
          <div className="mu" style={{ marginTop: "6px" }}>No plans scheduled for this date.</div>
        )}

        <div className="row" style={{ marginTop: "12px" }}>
          <input
            type="text"
            placeholder="e.g. Physics revision 6pm"
            value={newPlanInput}
            onChange={e => setNewPlanInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAddPlan(); }}
          />
          <button onClick={handleAddPlan}>Add</button>
        </div>
      </div>
    </div>
  );
}
