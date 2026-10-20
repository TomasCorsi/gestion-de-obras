import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const worker = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

function setup(failKeys = false) {
  const handlers: Record<string, (event: { waitUntil: (p: Promise<void>) => void }) => void> = {};
  const deleted: string[] = [];
  let unregistered = false;
  let navigated = false;
  runInNewContext(worker, {
    self: {
      registration: { scope: "https://example.test/", unregister: async () => { unregistered = true; } },
      skipWaiting: async () => {},
      addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; },
      clients: { claim: async () => {}, matchAll: async () => [{ url: "https://example.test/parte-diario", navigate: async () => { navigated = true; } }] },
    },
    caches: {
      keys: async () => {
        if (failKeys) throw new Error("cache unavailable");
        return ["html-cache", "static-resources", "workbox-precache-v2-https://example.test/", "firebase-messaging", "unrelated"];
      },
      delete: async (name: string) => { deleted.push(name); },
    },
  });
  let activation = Promise.resolve();
  handlers.activate({ waitUntil: p => { activation = p; } });
  return { activation, deleted, unregistered: () => unregistered, navigated: () => navigated };
}

describe("reemplazo del worker antiguo", () => {
  it("retira solo cachés de la app, vuelve a abrirla y se desregistra", async () => {
    const result = setup();
    await result.activation;
    expect(result.deleted).toEqual(["html-cache", "static-resources", "workbox-precache-v2-https://example.test/"]);
    expect(result.navigated()).toBe(true);
    expect(result.unregistered()).toBe(true);
  });
  it("se desregistra aunque falle la lectura de cachés", async () => {
    const result = setup(true);
    await expect(result.activation).rejects.toThrow("cache unavailable");
    expect(result.unregistered()).toBe(true);
  });
});