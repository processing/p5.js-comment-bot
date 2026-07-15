import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { verifySignature, Fetcher } from "./utils";
import { updateComment } from "./comments";
import { match } from "ts-pattern";
import type { Payload, Comment } from "./types";

const router = new Hono<{ Variables: { payload: Payload }; Bindings: Env }>();

router.get("/webhooks", async (c) => {
  return c.text("Beep boop");
});

router.post(
  "/webhooks",
  async (c, next) => {
    // Check that webhook is sent from GitHub by verifying the signature
    const signature = c.req.header("x-hub-signature-256");
    const body = await c.req.text();

    try {
      if (signature && (await verifySignature(signature.split("=")[1], body, env.WEBHOOK_SECRET))) {
        c.set("payload", JSON.parse(body) as Payload);
        await next();
      } else {
        return c.body("Forbidden", 403);
      }
    } catch {
      return c.body("Forbidden", 403);
    }
  },
  async (c) => {
    const payload = c.get("payload");
    // TODO: identify and execute steps according to workflow run
    await match(payload.workflow_run)
      .with(
        {
          name: "Publish approved pull requests and latest commit to pkg.pr.new",
          status: "completed",
          conclusion: "success",
        },
        async () => {
          console.log(`Receive workflow run: ${payload.workflow_run.html_url}`);

          const fetcher = new Fetcher(payload.installation.id);

          // Use installation access token to request workflow artifact
          const url = payload.workflow_run.artifacts_url;
          const data = await fetcher.getArtifacts(url);

          if (!data?.workflow.pull_request) {
            // Worflow not triggered by PR, no comment
            return c.body("");
          }

          // Fetch list of comments in PR
          const commentsRes = await fetcher.fetch(
            `https://api.github.com/repos/processing/p5.js/issues/${data.workflow.pull_request.number}/comments`,
          );
          const comments = await commentsRes.json<Comment[]>();
          // Find comment that the bot left previously
          const previousComment = comments.find((comment) => {
            return comment.body.includes("## Continuous Release");
          });
          const newComment = updateComment(
            previousComment?.body ?? "",
            data.packages,
            payload.workflow_run.head_sha.substring(0, 7),
          );

          if (previousComment) {
            // If comment was left previously, update it
            console.log("Update comment");
            const commentID = previousComment.id;
            await fetcher.fetch(
              `https://api.github.com/repos/processing/p5.js/issues/comments/${commentID}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  body: newComment,
                }),
              },
            );
            console.log(`Comment updated in PR ${data.workflow.pull_request.number}`);
          } else {
            // If comment not found previously, leave a new comment
            console.log("Create new comment");
            await fetcher.fetch(
              `https://api.github.com/repos/processing/p5.js/issues/${data.workflow.pull_request.number}/comments`,
              {
                method: "POST",
                body: JSON.stringify({
                  body: newComment,
                }),
              },
            );
            console.log(`Comment created in PR ${data.workflow.pull_request.number}`);
          }
        },
      )
      .with(
        {
          name: "",
          status: "completed",
          conclusion: "success",
        },
        async () => {},
      )
      .otherwise(() => {
        console.log(`Unsupported workflow: ${payload.workflow_run.name}`);
      });

    return c.body("");
  },
);

export default router;
