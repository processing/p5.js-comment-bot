import { env } from "cloudflare:workers";
import { merge, memoize } from "lodash";
import type { WorkflowRunArtifacts, ArtifactData } from "./types";
import JSZip, { type JSZipObject } from "jszip";

import * as jose from "jose";

const enc = new TextEncoder();

// Use app JWT token to exchange for installation access token
const getAuthToken = memoize(async function (installationID: number) {
  const jwt = await generateAPPJWT();
  const tokenRes = await fetch(
    `https://api.github.com/app/installations/${installationID}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "User-Agent": "p5-bot",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!tokenRes.ok) {
    console.error(`Request for installation auth token failed.`, await tokenRes.text());
    throw new Error("Failed to make request");
  }

  const { token } = await tokenRes.json<{ token: string }>();

  return token;
});

export async function verifySignature(signature: string, body: string, secret: string) {
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

  let equal = await crypto.subtle.verify("HMAC", key, hexToBytes(signature), enc.encode(body));

  return equal;
}

function hexToBytes(hex: string) {
  let len = hex.length / 2;
  let bytes = new Uint8Array(len);

  let index = 0;
  for (let i = 0; i < hex.length; i += 2) {
    let c = hex.slice(i, i + 2);
    let b = parseInt(c, 16);
    bytes[index] = b;
    index += 1;
  }

  return bytes;
}

export class Fetcher {
  installationID: number;

  constructor(installationID: number) {
    this.installationID = installationID;
  }

  async fetch(url: string, options?: RequestInit) {
    const token = await getAuthToken(this.installationID);
    const res = await fetch(
      url,
      merge(
        {
          method: "GET",
          headers: {
            "User-Agent": "p5-bot",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            Authorization: `Bearer ${token}`,
          },
        },
        options,
      ),
    );

    if (!res.ok) {
      console.error(`Request to ${options?.method || "GET"} ${url} failed.`, await res.text());
      throw new Error("Failed to make request");
    } else {
      return res;
    }
  }

  async getArtifacts(url: string) {
    const artifactsRes = await this.fetch(url);
    const { artifacts } = await artifactsRes.json<WorkflowRunArtifacts>();

    if (artifacts.length === 0) {
      console.warn("No workflow artifact detected. Is the workflow working?");
      return;
    }

    const artifactURL = artifacts[0].archive_download_url;
    const res = await this.fetch(artifactURL);
    const buffer = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const data = JSON.parse(
      await (zip.file("output.json") as JSZipObject).async("string"),
    ) as ArtifactData;

    return data;
  }
}

export async function generateAPPJWT() {
  const privateKey = await jose.importPKCS8(env.PRIVATE_KEY, "RS256");
  const jwt = await new jose.SignJWT()
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer(parseInt(env.APP_ID).toString())
    .setExpirationTime("5m")
    .sign(privateKey);

  return jwt;
}
