"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "@/styles/calendar.css";

export default function StudyCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventToDelete, setEventToDelete] = useState<any>(null);

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable
        editable
        events={events}
        headerToolbar={{
          left: "prev",
          center: "title",
          right: "next",
        }}
        dateClick={(info) => {
          setSelectedDate(info.dateStr);
          setShowModal(true);
        }}
        eventClick={(info) => {
          setEventToDelete({
            title: info.event.title,
            date: info.event.startStr,
          });
          setShowDeleteModal(true);
        }}
      />

      {/* Custom Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="relative bg-white text-[#0A2540] rounded-2xl p-6 w-[320px] shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10">
            {/* ❌ Tiny close - moved further into top-left corner */}

            <h3 className="text-lg font-semibold mb-2">What will you study?</h3>

            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. React Hooks"
              className="w-full rounded-lg px-3 py-2 bg-white/90 text-[#0A2540] outline-none border border-slate-200 focus:border-blue-500"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setTitle("");
                }}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>

              {/* ✅ Add button UNCHANGED as requested */}
              <button
                onClick={() => {
                  if (!title.trim()) return;

                  setEvents((prev) => [...prev, { title, date: selectedDate }]);
                  setShowModal(false);
                  setTitle("");
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal (improved legibility, no cross) */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="relative bg-white text-[#0A2540] rounded-2xl p-6 w-[320px] shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10">
              <h3 className="text-lg font-semibold mb-2">Remove task?</h3>

              <p className="text-sm text-slate-700 mb-4">
                This will remove <b>{eventToDelete?.title}</b> from{" "}
                {eventToDelete?.date}.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEventToDelete(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setEvents((prev) =>
                      prev.filter(
                        (e) =>
                          !(
                            e.title === eventToDelete.title &&
                            e.date === eventToDelete.date
                          )
                      )
                    );
                    setShowDeleteModal(false);
                    setEventToDelete(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg min-w-[88px] text-center"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}