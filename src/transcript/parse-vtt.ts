export interface TranscriptCue {
  start: number;
  end: number;
  text: string;
}

const TIME_RE = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

function parseTimestamp(line: string): number | null {
  const match = line.match(TIME_RE);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const ms = Number(match[4]);
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

export function parseVtt(content: string): TranscriptCue[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const cues: TranscriptCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.includes("-->")) {
      i += 1;
      continue;
    }
    const [startRaw, endRaw] = line.split("-->").map((s) => s.trim());
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw.split(" ")[0]);
    i += 1;
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].includes("-->")) {
      textLines.push(lines[i].trim().replace(/<[^>]+>/g, ""));
      i += 1;
    }
    const text = textLines.join(" ").trim();
    if (start !== null && end !== null && text) {
      cues.push({ start, end, text });
    }
  }
  return cues;
}
