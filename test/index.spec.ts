import { describe, it, assert } from "vitest";
import worker from "../src";

describe("p5.js Continuous Release", () => {
  it("should return placeholder text on basic get route", async () => {
    const req = new Request("http://example.com/webhooks");
    const res = await worker.fetch(req);
    assert(await res.text(), "beep boop");
  });
	it("should reject request that is not signed correctly", async () => {
		// No signature provided
		let req = new Request("http://example.com/webhooks", {
			method: "POST"
		});
		let res = await worker.fetch(req);
		assert.isFalse(res.ok);
		assert.equal(res.status, 403);

		// Incorrect signature provided
		req = new Request("http://example.com/webhooks", {
			method: "POST",
			headers: {
				"x-hub-signature-256": "incorrect"
			}
		});
		res = await worker.fetch(req);
		assert.isFalse(res.ok);
		assert.equal(res.status, 403)

		req = new Request("http://example.com/webhooks", {
			method: "POST",
			headers: {
				"x-hub-signature-256": "incorrect=wrong"
			}
		});
		res = await worker.fetch(req);
		assert.isFalse(res.ok);
		assert.equal(res.status, 403)
  });
});
