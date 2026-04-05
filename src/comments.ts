import type { ArtifactData } from ".";

export function updateComment(
  comment: string,
  packages: ArtifactData["packages"],
  commitHash: string,
) {
  const historyRegex = /#### (?<commitHash>.{7})\n(?<links>[\s\S]+?)\n\n/g;
  const currentCommitRegex = /Commit hash: (?<currentCommit>.{7})/g;
  const currentCDNRegex = /### CDN link\n\n(?<cdnLinks>[\s\S]+?)\n\n/g;
  const currentPackagesRegex = /### Published Packages\n\n(?<packagesLink>[\s\S]+?)\n\n/g;

  let result: RegExpExecArray;
  const history = [];
  while ((result = historyRegex.exec(comment)) !== null) {
    history.push(result.groups);
  }

  const currentCommitHash = currentCommitRegex.exec(comment)?.groups.currentCommit;
  const currentCDNLink = currentCDNRegex.exec(comment)?.groups.cdnLinks;
  const currentPackagesLink = currentPackagesRegex.exec(comment)?.groups.packagesLink;

  if (currentCommitHash && !history.find((item) => item.commitHash === currentCommitHash)) {
    history.unshift({
      commitHash: currentCommitHash,
      links: `${currentCDNLink}\n${currentPackagesLink}`,
    });
  }

  const historyList = history
    .map((item) => {
      return `
#### ${item.commitHash}
${item.links}
		`.trim();
    })
    .join("\n\n");
  const packagesList = packages.map((p) => `- ${p.url}`).join("\n");
  const cdnLinksList = packages
    .map((p) => `- ${p.url.replace("pkg.pr.new", "raw.esm.sh/pr")}/lib/p5.min.js`)
    .join("\n");

  const message = `## Continuous Release

### CDN link

${cdnLinksList}

### Published Packages

${packagesList}

Commit hash: ${commitHash}

<details>

<summary>Previous deployments</summary>

${historyList}

</details>


---

_This is an automated message._`;
  return message;
}
