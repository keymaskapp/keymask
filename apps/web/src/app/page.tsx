import { getConnectedBaidu } from "@/lib/baidu";
import { Landing } from "@/components/landing";
import { VaultPanel, type VaultFile } from "@/components/vault-panel";

const META_NAME = ".keysark.json";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const conn = await getConnectedBaidu();
  const { error } = await searchParams;

  if (!conn) {
    return <Landing error={error} />;
  }

  let vaultInitialized = false;
  let metaFileId: string | null = null;
  let files: VaultFile[] = [];
  let loadError: string | null = null;
  let user = { name: "", avatar: null as string | null };

  // 用户信息(头像/名称)与文件列表并行拉取;两者各自失败互不影响。
  const [infoRes, listRes] = await Promise.allSettled([
    conn.client.userInfo(),
    conn.client.list("", { order: "time", desc: true }),
  ]);

  if (infoRes.status === "fulfilled") {
    const info = infoRes.value;
    user = { name: info.netdisk_name || info.baidu_name || "", avatar: info.avatar_url || null };
  }

  if (listRes.status === "fulfilled") {
    const list = listRes.value;
    const meta = list.find((f) => f.isdir === 0 && f.server_filename === META_NAME);
    vaultInitialized = !!meta;
    metaFileId = meta ? String(meta.fs_id) : null;
    files = list
      .filter((f) => f.isdir === 0 && f.server_filename !== META_NAME)
      .map((f) => ({ id: String(f.fs_id), name: f.server_filename, size: f.size }));
  } else {
    loadError = String(listRes.reason);
  }

  return (
    <VaultPanel
      vaultInitialized={vaultInitialized}
      metaFileId={metaFileId}
      initialFiles={files}
      loadError={loadError}
      user={user}
    />
  );
}
