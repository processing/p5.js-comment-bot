import { env } from "cloudflare:workers";
import { Hono } from "hono";
import JSZip from "jszip";
import { verifySignature, request, generateAPPJWT } from "./utils";
import { updateComment } from "./comments";

interface Payload {
  workflow_run: {
    name: string;
    status: string;
    conclusion: string;
    html_url: string;
    artifacts_url: string;
    head_sha: string;
  };
  installation: {
    id: string;
  };
}

const router = new Hono<{ Variables: { payload: Payload }; Bindings: Env }>();

router.get("/webhooks", async (c) => {
  return c.text("Beep boop");
});

router.post(
  "/webhooks",
  async (c, next) => {
    const signature = c.req.header("x-hub-signature-256");
    const body = await c.req.text();

    if (signature && (await verifySignature(signature.split("=")[1], body, env.WEBHOOK_SECRET))) {
      c.set("payload", JSON.parse(body) as Payload);
      await next();
    } else {
      return c.body("Forbidden", 403);
    }
  },
  async (c) => {
    const payload = c.get("payload");
    if (
      payload.workflow_run.name ===
        "Publish approved pull requests and latest commit to pkg.pr.new" &&
      payload.workflow_run.status === "completed" &&
      payload.workflow_run.conclusion === "success"
    ) {
      console.log(`Receive workflow run: ${payload.workflow_run.html_url}`);

      const jwt = await generateAPPJWT();
      const installationID = payload.installation.id;
      const tokenRes = await request(
        `https://api.github.com/app/installations/${installationID}/access_tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        },
      );
      const { token } = await tokenRes.json<{ token: string }>();

      const url = payload.workflow_run.artifacts_url;
      const artifactsRes = await request(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { artifacts } = await artifactsRes.json<{
        artifacts: { archive_download_url: string }[];
      }>();
      if (artifacts.length === 0) {
        console.warn("No workflow artifact detected. Is the workflow working?");
        return c.body("");
      }

      const artifactURL = artifacts[0].archive_download_url;
      const res = await request(artifactURL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const buffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const data = JSON.parse(await zip.file("output.json").async("string"));

      if (!data.workflow.pull_request) {
        // Worflow not triggered by PR, no comment
        return c.body("");
      }

      // Fetch list of comments in PR
      const commentsRes = await request(
        `https://api.github.com/repos/processing/p5.js/issues/${data.workflow.pull_request.number}/comments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const comments = await commentsRes.json<{ body: string; id: string }[]>();
      const previousComment = comments.find((comment) => {
        return comment.body.includes("## Continuous Release");
      });

      if (previousComment) {
        console.log("Update comment");
        const commentID = previousComment.id;
        const newComment = updateComment(
          previousComment.body,
          data.packages,
          payload.workflow_run.head_sha.substring(0, 7),
        );

        await request(
          `https://api.github.com/repos/processing/p5.js/issues/comments/${commentID}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              body: newComment,
            }),
          },
        );
        console.log(`Comment updated in PR ${data.workflow.pull_request.number}`);
      } else {
        console.log("Create new comment");

        // Build and leave comment
        const packages = data.packages.map((p) => `- ${p.url}`).join("\n");

        const cdnLinks = data.packages
          .map((p) => `- ${p.url.replace("pkg.pr.new", "raw.esm.sh/pr")}/lib/p5.min.js`)
          .join("\n");
        const message = `## Continuous Release

### CDN link

${cdnLinks}

### Published Packages:

${packages}

Commit hash: ${payload.workflow_run.head_sha.substring(0, 7)}

<details>

<summary>Previous deployments</summary>

</details>

---

_This is an automated message._`;

        await request(
          `https://api.github.com/repos/processing/p5.js/issues/${data.workflow.pull_request.number}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              body: message,
            }),
          },
        );

        console.log(`Comment created in PR ${data.workflow.pull_request.number}`);
      }
    }

    return c.body("");
  },
);

export default router;
