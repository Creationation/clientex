import { SALON, SALON_ADDRESS_LINE } from "@/data/salon";

interface IcsInput {
  title: string;
  description: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  uid: string;
}

function stamp(date: string, time: string): string {
  // Heure locale de Vienne, declaree en TZID pour rester correcte ete comme hiver.
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

function escape(text: string): string {
  return text
    .replace(/[\\]/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcs(input: IcsInput): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DEL Herren//Booking//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}@delherren.app`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/Vienna:${stamp(input.date, input.startTime)}`,
    `DTEND;TZID=Europe/Vienna:${stamp(input.date, input.endTime)}`,
    `SUMMARY:${escape(input.title)}`,
    `DESCRIPTION:${escape(input.description)}`,
    `LOCATION:${escape(`${SALON.name}, ${SALON_ADDRESS_LINE}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(input.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(input: IcsInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.description,
    location: `${SALON.name}, ${SALON_ADDRESS_LINE}`,
    dates: `${stamp(input.date, input.startTime)}/${stamp(input.date, input.endTime)}`,
    ctz: "Europe/Vienna",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
