"use client";

// 【临时】验收页:vaults=[] 直接进创建流程,验证加密 HTML 备份。验收完删除。
import { VaultPanel } from "@/components/vault-panel";

export default function LockTestPage() {
  return (
    <VaultPanel
      vaults={[]}
      user={{ name: "lock-tester", avatar: null }}
      provider="google"
      storageRoot="appDataFolder"
    />
  );
}
