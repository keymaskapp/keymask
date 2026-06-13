import type { Metadata } from "next";
import { Docs } from "@/components/docs";

export const metadata: Metadata = {
  title: "ark CLI 使用文档 / CLI documentation — KeysArk",
  description:
    "ark 是 KeysArk 的命令行客户端:在终端读写端到端加密保险库,加解密只在本地完成。 / ark is the KeysArk command-line client — read and write your end-to-end encrypted vault from the terminal.",
};

export default function DocsPage() {
  return <Docs />;
}
