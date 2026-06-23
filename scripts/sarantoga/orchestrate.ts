import { Agent, CursorAgentError } from "@cursor/sdk";
import {
  addClosesIssue,
  closeIssue,
  fetchIssue,
  fetchNextReadyIssue,
  labelPr,
  latestOpenPr,
  markIssueInProgress,
  markPrReady,
  squashMerge,
  watchChecks,
} from "./github.mjs";
import { notify } from "./notify.mjs";

const repo = process.env.GITHUB_REPOSITORY ?? process.env.SARANTOGA_REPO ?? "";
const mode = process.env.SARANTOGA_MODE ?? "run";
const task = process.env.SARANTOGA_TASK?.trim() ?? "";
const issueInput = process.env.SARANTOGA_ISSUE_NUMBER?.trim();
const readyLabel = process.env.SARANTOGA_ISSUE_LABEL ?? "sarantoga:ready";
const progressLabel =
  process.env.SARANTOGA_ISSUE_IN_PROGRESS_LABEL ?? "sarantoga:in-progress";
const verifyCmd = process.env.SARANTOGA_VERIFY_CMD ?? "pnpm verify";
const projectContext = process.env.SARANTOGA_PROJECT_CONTEXT?.trim() ?? "";

function requirementsBlock(extra = ""): string {
  const lines: string[] = [];
  if (projectContext) lines.push(projectContext);
  if (extra) lines.push(extra);
  lines.push("- Create a feature branch for this work.");
  lines.push(
    `- Run \`${verifyCmd}\` before pushing when the script exists in the repo.`,
  );
  lines.push("- Read AGENTS.md before making architectural decisions.");
  lines.push(
    "- Read ROADMAP.md when present for phase order and acceptance criteria.",
  );
  lines.push("- Open a ready-for-review PR against main (not a draft).");
  return lines.join("\n");
}

function buildRunPrompt(text: string): string {
  return `${text}

Requirements:
${requirementsBlock()}`;
}

function buildIssuePrompt(issue: {
  number: number;
  title: string;
  body: string;
  url: string;
}): string {
  return `Implement GitHub issue #${issue.number}: ${issue.title}

Issue URL: ${issue.url}

${issue.body?.trim() || "(No issue body.)"}

Requirements:
${requirementsBlock('- Include "Closes #' + issue.number + '" in the PR description.')}`;
}

async function main(): Promise<void> {
  if (!repo) throw new Error("GITHUB_REPOSITORY or SARANTOGA_REPO is required");
  if (!process.env.CURSOR_API_KEY) throw new Error("CURSOR_API_KEY is required");

  let issueNumber: number | undefined;
  let prompt: string;

  if (mode === "ingest") {
    const issue = issueInput
      ? fetchIssue(repo, Number.parseInt(issueInput, 10))
      : fetchNextReadyIssue(repo, readyLabel);
    if (!issue) throw new Error(`No open issues with label ${readyLabel}`);
    issueNumber = issue.number;
    markIssueInProgress(repo, issue.number, readyLabel, progressLabel);
    prompt = buildIssuePrompt(issue);
    await notify("Sarantoga", `Cloud run started for issue #${issue.number}`);
    console.log(`Ingesting issue #${issue.number}: ${issue.title}`);
  } else {
    prompt = buildRunPrompt(
      task || "Implement the next roadmap slice from open issues.",
    );
    await notify("Sarantoga", "Cloud run started");
    console.log(`Task: ${task || "(default)"}`);
  }

  const result = await Agent.prompt(prompt, {
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: "composer-2.5" },
    cloud: {
      repos: [{ url: `https://github.com/${repo}`, startingRef: "main" }],
      autoCreatePR: true,
      skipReviewerRequest: true,
    },
  });

  if (result.status === "error") {
    await notify("Sarantoga failed", "Cloud agent run failed", "high");
    process.exit(2);
  }

  console.log("Agent status:", result.status);

  const pr = latestOpenPr(repo);
  if (!pr) {
    await notify("Sarantoga", "Agent finished but no open PR was found", "high");
    return;
  }

  if (issueNumber !== undefined) addClosesIssue(repo, pr, issueNumber);
  markPrReady(repo, pr);
  labelPr(repo, pr);

  console.log(`Watching CI for PR #${pr}...`);
  const ok = watchChecks(repo, pr);

  if (!ok) {
    await notify("Sarantoga — checks failed", `PR #${pr} failed CI`, "high");
    process.exit(1);
  }

  squashMerge(repo, pr);
  if (issueNumber !== undefined) {
    closeIssue(repo, issueNumber, pr, progressLabel);
  }

  await notify("Sarantoga — merged", `PR #${pr} merged to main`);
  console.log(`Done. PR #${pr} merged.`);
}

main().catch(async (err) => {
  if (err instanceof CursorAgentError) {
    await notify("Sarantoga failed", err.message, "high");
    console.error("Startup failed:", err.message);
    process.exit(1);
  }
  await notify("Sarantoga failed", String(err), "high");
  throw err;
});
