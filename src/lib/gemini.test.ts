import { describe, expect, it } from "vitest";

describe("translateCitiesFn", () => {
  it("loads the server function module without using stale TanStack Start APIs", async () => {
    await expect(import("./gemini")).resolves.toMatchObject({
      translateCitiesFn: expect.any(Function),
    });
  });
});
