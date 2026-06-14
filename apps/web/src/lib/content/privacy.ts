import type { DocContent } from "./types";

export const PRIVACY: DocContent = {
  en: {
    title: "Privacy Policy",
    description:
      "KeysArk is built so that we — and anyone else — only ever see ciphertext. This page explains what that means for your data.",
    body: [
      {
        k: "p",
        t: "KeysArk is built so that we — and anyone else — only ever see ciphertext. This page explains what that means for your data in plain terms.",
      },
      { k: "h2", t: "What we never see" },
      {
        k: "ul",
        items: [
          "Your recovery phrase.",
          "The master key derived from it.",
          "The plaintext of anything you store.",
        ],
      },
      {
        k: "p",
        t: "These exist only in your browser's memory and never leave your device — they are never sent to our servers, put in a URL, written to a log, or stored in a database.",
      },
      { k: "h2", t: "What the server stores" },
      {
        k: "p",
        t: "Only the OAuth tokens needed to talk to your cloud drive on your behalf, keyed by provider and account. Your encrypted content lives in your own Google Drive or Baidu netdisk — not on our servers. We move opaque ciphertext between your browser and your drive; we do not keep a copy.",
      },
      { k: "h2", t: "Cookies" },
      {
        k: "ul",
        items: [
          "A session cookie after you sign in, so your browser stays connected to your drive.",
          "A small cookie remembering your theme (light/dark).",
          "Your language is carried in the URL, not a cookie.",
        ],
      },
      {
        k: "p",
        t: "We do not use analytics or tracking cookies, and we do not profile you.",
      },
      { k: "h2", t: "Third parties" },
      {
        k: "p",
        t: "Signing in uses Google or Baidu OAuth. How they handle your account and storage is governed by their own privacy policies.",
      },
      { k: "h2", t: "Deleting your data" },
      {
        k: "ul",
        items: [
          "Sign out to clear the session on this device.",
          "Delete the KeysArk files in your own cloud drive at any time.",
          "Revoke KeysArk's access from your Google or Baidu account settings.",
        ],
      },
      { k: "h2", t: "Changes" },
      {
        k: "p",
        t: "We will update this page if our practices change. Last updated: June 2026.",
      },
    ],
  },
  zh: {
    title: "隐私政策",
    description: "KeysArk 的设计让我们(以及任何人)始终只能看到密文。本页用大白话说明这对你的数据意味着什么。",
    body: [
      {
        k: "p",
        t: "KeysArk 的设计让我们(以及任何人)始终只能看到密文。本页用大白话说明这对你的数据意味着什么。",
      },
      { k: "h2", t: "我们永远看不到的" },
      {
        k: "ul",
        items: ["你的助记词。", "由它派生出的主密钥。", "你存入的任何明文内容。"],
      },
      {
        k: "p",
        t: "这些只存在于你浏览器的内存里,永不离开你的设备——绝不会被发往我们的服务端、放进 URL、写入日志或存进数据库。",
      },
      { k: "h2", t: "服务端存了什么" },
      {
        k: "p",
        t: "只存代我们访问你云盘所必需的 OAuth 令牌,按「提供商 + 账号」存放。你的加密内容存在你自己的 Google Drive 或百度网盘里,而不在我们的服务器上。我们只在你的浏览器与你的云盘之间搬运不透明的密文,不留副本。",
      },
      { k: "h2", t: "Cookie" },
      {
        k: "ul",
        items: [
          "登录后的会话 cookie,让你的浏览器与云盘保持连接。",
          "一个记住你主题(浅色/深色)的小 cookie。",
          "你的语言记录在 URL 里,而非 cookie。",
        ],
      },
      { k: "p", t: "我们不使用任何统计或追踪 cookie,也不对你做画像。" },
      { k: "h2", t: "第三方" },
      {
        k: "p",
        t: "登录使用 Google 或百度的 OAuth。它们如何处理你的账号与存储,受其各自的隐私政策约束。",
      },
      { k: "h2", t: "删除你的数据" },
      {
        k: "ul",
        items: [
          "退出登录即可清除本设备上的会话。",
          "随时在你自己的云盘里删除 KeysArk 的文件。",
          "在 Google 或百度的账号设置里撤销 KeysArk 的访问授权。",
        ],
      },
      { k: "h2", t: "变更" },
      { k: "p", t: "若我们的做法有变,会更新本页。最后更新:2026 年 6 月。" },
    ],
  },
};
