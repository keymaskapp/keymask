import type { DocContent } from "./types";

export const ABOUT: DocContent = {
  en: {
    title: "About KeyMask",
    description:
      "KeyMask is an open-source, free, end-to-end encrypted vault for your passwords, keys, and secret text — stored in a cloud drive you already own.",
    body: [
      {
        k: "p",
        t: "KeyMask is an open-source, free, end-to-end encrypted vault for your passwords, keys, and secret text. Instead of trusting a vendor's database with your secrets, KeyMask encrypts everything in your browser and stores the ciphertext in a cloud drive you already own.",
      },
      { k: "h2", t: "The principle: you hold the only key" },
      {
        k: "p",
        t: "Encryption and decryption happen only in your browser, with a key derived from a BIP39 recovery phrase that never leaves your device. Our server and your cloud drive only ever handle opaque ciphertext — a breach of either reveals nothing.",
      },
      { k: "h2", t: "How it works" },
      {
        k: "ul",
        items: [
          "Write down a 24-word BIP39 recovery phrase — it is your master key.",
          "The phrase derives an AES-256 key locally, right in the browser.",
          "Your content is sealed with `AES-256-GCM` before anything leaves the device.",
          "The ciphertext is stored in your own Google Drive or Baidu netdisk.",
        ],
      },
      { k: "h2", t: "Open source and free" },
      {
        k: "p",
        t: "There are no accounts to buy and no subscription. The whole stack is public, so you can audit the cryptography line by line, or run your own instance. We never touch your storage and never charge you.",
      },
      { k: "h2", t: "Who it's for" },
      {
        k: "p",
        t: "Developers stashing `.env` files and API keys, and anyone who wants genuine self-custody of their secrets — without handing the keys to a third party.",
      },
      { k: "h2", t: "Get involved" },
      {
        k: "p",
        t: "KeyMask is open source. Read the code, audit the encryption, file issues, and send pull requests — links are in the header and footer.",
      },
    ],
  },
  zh: {
    title: "关于 KeyMask",
    description:
      "KeyMask 是一个开源免费、端到端加密的保管库,用来存放你的密码、密钥与机密文本——密文存进你自己已有的云盘。",
    body: [
      {
        k: "p",
        t: "KeyMask 是一个开源免费、端到端加密的保管库,用来存放你的密码、密钥与机密文本。它不把你的秘密托付给厂商的数据库,而是在你的浏览器里完成加密,再把密文存进你自己已有的云盘。",
      },
      { k: "h2", t: "核心原则:钥匙只在你手上" },
      {
        k: "p",
        t: "加解密只在你的浏览器里发生,密钥由一组 BIP39 助记词派生,且永不离开你的设备。我们的服务端与你的云盘全程只经手不透明的密文——任何一方被脱库都读不到内容。",
      },
      { k: "h2", t: "工作原理" },
      {
        k: "ul",
        items: [
          "写下 24 词 BIP39 助记词——它就是你的主密钥。",
          "助记词在浏览器里本地派生出 AES-256 密钥。",
          "内容在离开设备前用 `AES-256-GCM` 封成密文。",
          "密文存进你自己的 Google Drive 或百度网盘。",
        ],
      },
      { k: "h2", t: "开源且免费" },
      {
        k: "p",
        t: "没有要购买的账号,也没有订阅。整套代码公开,你可以逐行审计加密实现,或自行托管。我们不碰你的存储,也不向你收一分钱。",
      },
      { k: "h2", t: "适合谁" },
      {
        k: "p",
        t: "需要安放 `.env` 文件与 API 密钥的开发者,以及任何想真正自我保管秘密、而不愿把钥匙交给第三方的人。",
      },
      { k: "h2", t: "参与进来" },
      {
        k: "p",
        t: "KeyMask 是开源项目。阅读代码、审计加密、提交 issue 与 PR——入口就在页眉与页脚。",
      },
    ],
  },
};
