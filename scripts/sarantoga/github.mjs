import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function ghJson(args) {
  return JSON.parse(
    execSync(`gh ${args}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }),
  );
}

export function ghRun(args, inherit = false) {
  return execSync(`gh ${args}`, {
    encoding: "utf8",
    stdio: inherit ? "inherit" : ["pipe", "pipe", "inherit"],
  }).trim();
}

export function latestOpenPr(repo) {
  try {
    const n = Number.parseInt(
      ghRun(
        `pr list --repo ${repo} --state open --json number --jq 'max_by(.number).number'`,
      ),
      10,
    );
    return Number.isNaN(n) ? undefined : n;
  } catch {
    return undefined;
  }
}

export function markPrReady(repo, pr) {
  ghRun(`pr ready ${pr} --repo ${repo}`, true);
}

export function labelPr(repo, pr) {
  ghRun(`pr edit ${pr} --repo ${repo} --add-label sarantoga`, true);
}

export function addClosesIssue(repo, pr, issueNumber) {
  const body = ghJson(`pr view ${pr} --repo ${repo} --json body`).body;
  if (body.toLowerCase().includes(`closes #${issueNumber}`)) return;
  const updated = `${body.trimEnd()}\n\nCloses #${issueNumber}\n`;
  const file = join(tmpdir(), `sarantoga-pr-${pr}.md`);
  writeFileSync(file, updated);
  try {
    ghRun(`pr edit ${pr} --repo ${repo} --body-file "${file}"`);
  } finally {
    unlinkSync(file);
  }
}

export function watchChecks(repo, pr) {
  try {
    execSync(`gh pr checks ${pr} --repo ${repo} --watch`, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

export function squashMerge(repo, pr) {
  ghRun(`pr merge ${pr} --repo ${repo} --squash --delete-branch`, true);
}

export function fetchIssue(repo, issueNumber) {
  return ghJson(
    `issue view ${issueNumber} --repo ${repo} --json number,title,body,url`,
  );
}

export function fetchNextReadyIssue(repo, readyLabel) {
  const issues = ghJson(
    `issue list --repo ${repo} --state open --label "${readyLabel}" --json number,title,body,url --limit 30`,
  );
  if (!issues.length) return undefined;
  return issues.sort((a, b) => a.number - b.number)[0];
}

export function markIssueInProgress(repo, issueNumber, readyLabel, progressLabel) {
  ghRun(
    `issue edit ${issueNumber} --repo ${repo} --add-label "${progressLabel}" --remove-label "${readyLabel}"`,
  );
}

export function closeIssue(repo, issueNumber, pr, progressLabel) {
  ghRun(
    `issue close ${issueNumber} --repo ${repo} --comment "Merged in #${pr}."`,
  );
  ghRun(`issue edit ${issueNumber} --repo ${repo} --remove-label "${progressLabel}"`);
}
