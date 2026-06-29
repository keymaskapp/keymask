import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { NextConfig } from "next";

// 注入应用版本号 + 构建所用的 git 提交与仓库地址。导出助记词 PDF/HTML 时一并标注,
// 让用户/审计者能据此检出「生成这份备份的确切源码」核对端到端加密实现。
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  version?: string;
  repository?: string | { url?: string };
};

/** ark CLI(@keymask/cli)的版本号:从同仓库的 apps/cli/package.json 读取,展示在文档/落地页。 */
function cliVersion(): string {
  try {
    const j = JSON.parse(
      readFileSync(join(process.cwd(), "..", "cli", "package.json"), "utf8"),
    ) as { version?: string };
    return j.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** 归一化仓库地址为可点击的 https 形式:git@github.com:org/repo.git → https://github.com/org/repo */
function normalizeRepo(raw: string): string {
  let s = raw.replace(/^git\+/, "").trim();
  const ssh = s.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  s = s.replace(/^ssh:\/\/git@/, "https://").replace(/\.git$/, "");
  return s;
}

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
}

/** 构建所用提交短哈希;工作区有未提交改动时附 `-dirty`。无 git 时降级 "unknown",绝不让构建失败。 */
function gitCommit(): string {
  // 平台/CI 优先(从 tarball 或浅克隆构建时 git 命令可能不可用)。
  const fromEnv =
    process.env.KEYMASK_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 12);
  try {
    const sha = git("rev-parse --short=12 HEAD");
    if (!sha) return "unknown";
    let dirty = "";
    try {
      if (git("status --porcelain")) dirty = "-dirty";
    } catch {
      /* 忽略 */
    }
    return sha + dirty;
  } catch {
    return "unknown";
  }
}

/** 仓库地址:env > Vercel owner/slug > package.json#repository > git origin > 空。 */
function repoUrl(): string {
  if (process.env.KEYMASK_REPO) return normalizeRepo(process.env.KEYMASK_REPO);
  const { VERCEL_GIT_REPO_OWNER: owner, VERCEL_GIT_REPO_SLUG: slug } = process.env;
  if (owner && slug) return `https://github.com/${owner}/${slug}`;
  const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  if (repo) return normalizeRepo(repo);
  try {
    const remote = git("config --get remote.origin.url");
    if (remote) return normalizeRepo(remote);
  } catch {
    /* 忽略 */
  }
  return "";
}

/** 解析某依赖的已安装精确版本(从给定 package.json 起算的依赖解析图)。失败回退声明范围。 */
function depVersion(fromPkgJson: string, name: string): string {
  try {
    const req = createRequire(fromPkgJson);
    let dir = dirname(req.resolve(name)); // 包内某入口文件,向上找到该包的 package.json
    for (let i = 0; i < 8; i++) {
      const pj = join(dir, "package.json");
      if (existsSync(pj)) {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; version?: string };
        if (j.name === name && j.version) return j.version;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    /* 落到下面的范围回退 */
  }
  return cryptoPkg.dependencies?.[name] ?? "n/a";
}

const webPkgJson = join(process.cwd(), "package.json");
const cryptoPkgJson = join(process.cwd(), "..", "..", "packages", "crypto", "package.json");
const cryptoPkg = JSON.parse(readFileSync(cryptoPkgJson, "utf8")) as {
  dependencies?: Record<string, string>;
};

// 构建环境与关键依赖版本清单。连同源码出处一并写进助记词备份(PDF/HTML),
// 让用户即便多年以后,也能据此还原「生成这份备份的软件运行环境」并复现解密。
const buildManifest = {
  buildTime: new Date().toISOString(),
  node: process.version,
  deps: {
    next: depVersion(webPkgJson, "next"),
    react: depVersion(webPkgJson, "react"),
    jspdf: depVersion(webPkgJson, "jspdf"),
    "hash-wasm": depVersion(cryptoPkgJson, "hash-wasm"),
    "@scure/bip39": depVersion(cryptoPkgJson, "@scure/bip39"),
    "@noble/hashes": depVersion(cryptoPkgJson, "@noble/hashes"),
  },
};

const config: NextConfig = {
  env: {
    NEXT_PUBLIC_KEYMASK_VERSION: pkg.version ?? "0.0.0",
    NEXT_PUBLIC_KEYMASK_CLI_VERSION: cliVersion(),
    NEXT_PUBLIC_KEYMASK_COMMIT: gitCommit(),
    NEXT_PUBLIC_KEYMASK_REPO: repoUrl(),
    NEXT_PUBLIC_KEYMASK_BUILD: JSON.stringify(buildManifest),
  },
  transpilePackages: [
    "@keymask/ui",
    "@keymask/db",
    "@keymask/baidupan",
    "@keymask/googledrive",
    "@keymask/crypto",
    "@keymask/vault",
  ],
  typedRoutes: true,
};

export default config;
