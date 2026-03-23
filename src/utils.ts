import { env } from "cloudflare:workers";
import merge from "lodash.merge";
import * as jose from "jose";

const enc = new TextEncoder();

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

export async function request(url: string, options: RequestInit) {
  const res = await fetch(
    url,
    merge(
      {
        method: "GET",
        headers: {
          "User-Agent": "p5-bot",
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      options,
    ),
  );

  if (!res.ok) {
    console.error(`Request to ${options.method || "GET"} ${url} failed.`, await res.text());
    throw new Error("Failed to make request");
  } else {
    return res;
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
