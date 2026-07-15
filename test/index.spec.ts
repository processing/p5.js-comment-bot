import { env } from "cloudflare:workers";
import { describe, it, assert, vi, expect } from "vite-plus/test";
import worker from "../src";
import { updateComment } from "../src/comments";

vi.mock(import("../src/comments"), () => {
  return {
    updateComment: vi.fn(),
  };
});

vi.mock(import("../src/utils"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    verifySignature: original.verifySignature,
    request: vi.fn(() => {
      return {
        json: () => {
          return { artifacts: [{ archive_download_url: "" }] };
        },
      };
    }),
    generateAPPJWT: original.generateAPPJWT,
  };
});

describe("p5.js Continuous Release", () => {
  it("should return placeholder text on basic get route", async () => {
    const req = new Request("http://example.com/webhooks");
    const res = await worker.fetch(req);
    assert(await res.text(), "beep boop");
  });

  it("should reject request that is not signed correctly", async () => {
    // No signature provided
    let req = new Request("http://example.com/webhooks", {
      method: "POST",
    });
    let res = await worker.fetch(req);
    assert.isFalse(res.ok);
    assert.equal(res.status, 403);

    // Incorrect signature provided
    req = new Request("http://example.com/webhooks", {
      method: "POST",
      headers: {
        "x-hub-signature-256": "incorrect",
      },
    });
    res = await worker.fetch(req);
    assert.isFalse(res.ok);
    assert.equal(res.status, 403);

    req = new Request("http://example.com/webhooks", {
      method: "POST",
      headers: {
        "x-hub-signature-256": "incorrect=wrong",
      },
    });
    res = await worker.fetch(req);
    assert.isFalse(res.ok);
    assert.equal(res.status, 403);
  });

  it.todo("should call relevant functions with expected arguments", async () => {
    const body = JSON.stringify({
      installation: {
        id: "some-id",
      },
      workflow_run: {
        name: "Publish approved pull requests and latest commit to pkg.pr.new",
        status: "completed",
        conclusion: "success",
        html_url: "https://example.com",
        artifacts_url: "https://example.com/artifacts",
        head_sha: "random",
      },
    });
    const signature = await signMessage(body, env.WEBHOOK_SECRET);
    const req = new Request("http://example.com/webhooks", {
      method: "POST",
      headers: {
        "x-hub-signature-256": `sha256=${signature}`,
      },
      body,
    });
    const res = await worker.fetch(req);

    assert.isTrue(res.ok);
    expect(updateComment).toHaveBeenCalledOnce();
  });
});

async function signMessage(body: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    {
      name: "HMAC",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign", "verify"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(body));

  return bytesToHex(signature);
}

function bytesToHex(buffer: ArrayBuffer) {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}
