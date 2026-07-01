import { pluginScriptPath } from "../plugin-script-path";
import { appendLog } from "../ytdl";
import { commonYtdlpFlags, execBashJsonLine } from "../ytdlp-script";
import { parseVtt } from "./parse-vtt";
import type { TranscriptCue } from "./parse-vtt";

export type { TranscriptCue } from "./parse-vtt";

const TRANSCRIPT_SCRIPT = "scripts/transcript.sh";

interface TranscriptPayload {
  vtt?: string;
  error?: string;
}

function transcriptScriptPath(): string {
  return pluginScriptPath("transcript_script", TRANSCRIPT_SCRIPT);
}

export async function fetchTranscript(watchUrl: string): Promise<TranscriptCue[]> {
  const args = [transcriptScriptPath(), watchUrl, ...commonYtdlpFlags()];
  const result = await execBashJsonLine<TranscriptPayload>(args, "Fetching transcript");
  if (!result.ok || !result.data) {
    appendLog(`fetchTranscript failed: ${result.error || "unknown"}`);
    return [];
  }
  if (result.data.error) {
    appendLog(`transcript error: ${result.data.error}`);
    return [];
  }
  if (!result.data.vtt) {
    return [];
  }
  return parseVtt(result.data.vtt);
}
