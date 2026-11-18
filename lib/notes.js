// Booking rules and walk-in context from library.yale.edu/visit-and-study/places-study
// and the Bass library page, checked 17 Nov 2026. No extra LibCal calls.

const NOTES = {
  "Bass Library Group Study Rooms":
    "Lower level, for 2–8 people. Yale ID to book and to swipe in. Wireless and outlets; some rooms have a screen.",
  "Individual Study Rooms - Courtyard Level":
    "ADA room on the courtyard level. These two can be reserved. Other individual rooms in Bass are first-come and are not listed here.",
  "Bass Library - Thain Café": "Reservable high tables in the café, not a private room.",
  "Arts Library Group Study Rooms":
    "Room 108 is on the main level and B36 is downstairs. For 2–6 people. Monitor, whiteboard, and a TV with VHS and DVD. Yale ID required.",
  "Dedicated Research Terminals at Marx Library":
    "A Bloomberg terminal, not a study room. Main level of Marx. Yale ID to swipe into Kline Tower.",
  "Marx Library Classroom": "Main level of Marx. Yale ID to swipe into Kline Tower.",
  "Marx Library Study Spaces":
    "For Yale faculty, staff, and students. Yale ID to swipe into Kline Tower.",
  "Rosenkranz Hall Classroom":
    "The only Rosenkranz room on this calendar. Other rooms in the building go through 25Live.",
  "Sterling Memorial Library":
    "Lower level, beside the Wright Reading Room, under the Nave. For two or more people. Blackboard, wireless, and a projector. Yale ID to get in.",
  "Research Screening Room": "Floor 7 of Sterling, in the Film Archive.",
};

export function annotateRoom(room, at) {
  if (room.category === "Bass Library Instruction Rooms") {
    const limited = staffWindow(at);
    return {
      note: limited
        ? "Library staff only until 5:00pm on weekdays. Yale students, faculty, and other staff can book after 5:00pm and on weekends. Yale ID to swipe in."
        : "Yale students, faculty, and staff can book this evening and on weekends. On weekdays before 5:00pm it is library staff only. Yale ID to swipe in.",
      limited,
    };
  }
  const note = NOTES[room.category] || boothNote(room);
  return { note, limited: false };
}

function boothNote(room) {
  if (!String(room.category || "").startsWith("Viewing Booth")) return "";
  const extra = room.capacity >= 2 ? " This one also plays VHS and LaserDisc." : "";
  return `Floor 7 of Sterling, in the Film Archive. Headphones, DVD, and Blu-ray.${extra}`;
}

function staffWindow(at) {
  const [day, time] = String(at || "").split(" ");
  if (!day || !time) return false;
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (![year, month, date, hour, minute].every(Number.isFinite)) return false;
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  const minutes = hour * 60 + minute;
  return minutes >= 8 * 60 + 30 && minutes < 17 * 60;
}
