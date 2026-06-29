import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveConn, saveCloud } from "./config";

function withHome(fn: () => void): void {
  const prevHome = process.env.KEYMASK_HOME;
  const prevServer = process.env.KEYMASK_SERVER;
  const dir = mkdtempSync(join(tmpdir(), "keymask-cli-test-"));
  try {
    process.env.KEYMASK_HOME = dir;
    delete process.env.KEYMASK_SERVER;
    fn();
  } finally {
    if (prevHome === undefined) delete process.env.KEYMASK_HOME;
    else process.env.KEYMASK_HOME = prevHome;
    if (prevServer === undefined) delete process.env.KEYMASK_SERVER;
    else process.env.KEYMASK_SERVER = prevServer;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("legacy cloud token without issuer is not usable", () => {
  withHome(() => {
    saveCloud({ token: "ksk_legacy" });
    const conn = resolveConn();

    assert.equal(conn.issuer, null);
    assert.equal(conn.tokenUsableHere, false);
  });
});

test("cloud token is usable only for its issuer", () => {
  withHome(() => {
    saveCloud({ token: "ksk_bound", issuer: "https://keymask.com/" });

    assert.equal(resolveConn().tokenUsableHere, true);
    assert.equal(resolveConn("https://example.com").tokenUsableHere, false);
  });
});
