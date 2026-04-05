import { describe, it, assert } from "vitest";
import { updateComment } from "../src/comments";

describe("Update comments", () => {
  const createNewComment = (buildHash: string, commitHash: string) => {
    return `
## Continuous Release

### CDN link

- https://raw.esm.sh/pr/p5@${buildHash}/lib/p5.min.js

### Published Packages

- https://pkg.pr.new/p5@${buildHash}

Commit hash: ${commitHash}

<details>

<summary>Previous deployments</summary>



</details>


---

_This is an automated message._
`.trim();
  };
  const createUpdatedComment1 = (
    buildHash: string,
    commitHash: string,
    previousHashes: {
      build: string;
      commit: string;
    }[],
  ) => {
    return `
## Continuous Release

### CDN link

- https://raw.esm.sh/pr/p5@${buildHash}/lib/p5.min.js

### Published Packages

- https://pkg.pr.new/p5@${buildHash}

Commit hash: ${commitHash}

<details>

<summary>Previous deployments</summary>

${previousHashes
  .map((hashes) => {
    return `
#### ${hashes.commit}
- https://raw.esm.sh/pr/p5@${hashes.build}/lib/p5.min.js
- https://pkg.pr.new/p5@${hashes.build}
`.trim();
  })
  .join("\n\n")}

</details>


---

_This is an automated message._
`.trim();
  };
  const createPackages = (urlHash: string) => {
    return [
      {
        name: "p5",
        url: `https://pkg.pr.new/p5@${urlHash}`,
        shasum: "not used",
      },
    ];
  };

  it("should return new comment in expected format if `comment` argument is not defined", () => {
    const buildHash = "cde9b73";
    const commitHash = "4715313";
    const packages = createPackages(buildHash);
    const newCommentExample = createNewComment(buildHash, commitHash);
    assert.equal(updateComment(null, packages, commitHash), newCommentExample);
  });
  it("should return updated comment with new package in expected format", () => {
    const buildHash = "45ef830";
    const commitHash = "25635f1";
    const previousBuildHash = "cde9b73";
    const previousCommitHash = "4715313";
    const packages = createPackages(buildHash);
    const newCommentExample = createNewComment(previousBuildHash, previousCommitHash);
    const updatedCommentExample = createUpdatedComment1(buildHash, commitHash, [
      {
        build: previousBuildHash,
        commit: previousCommitHash,
      },
    ]);
    assert.equal(updateComment(newCommentExample, packages, commitHash), updatedCommentExample);
  });
  it("should preserve link history as it return updated comment", () => {
    const buildHash = "45ef830";
    const commitHash = "25635f1";
    const previousBuildHash1 = "cde9b73";
    const previousCommitHash1 = "4715313";
    const previousBuildHash2 = "d70ed23";
    const previousCommitHash2 = "54ba15f";
    const packages = createPackages(buildHash);
    const updatedCommentExample1 = createUpdatedComment1(previousBuildHash1, previousCommitHash1, [
      {
        build: previousBuildHash2,
        commit: previousCommitHash2,
      },
    ]);
    const updatedCommentExample2 = createUpdatedComment1(buildHash, commitHash, [
      {
        build: previousBuildHash1,
        commit: previousCommitHash1,
      },
      {
        build: previousBuildHash2,
        commit: previousCommitHash2,
      },
    ]);

    assert.equal(updateComment(updatedCommentExample1, packages, commitHash), updatedCommentExample2);
  });
});
