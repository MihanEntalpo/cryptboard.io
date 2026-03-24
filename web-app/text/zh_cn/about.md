# CryptBoard - 加密匿名互联网剪贴板

> 这是一个 Beta 版本。如果遇到问题，你可以通过 [GitHub Issues](https://github.com/MihanEntalpo/cryptboard.io/issues) 或 Telegram 群组联系开发者：<https://t.me/joinchat/QZNQ2I35mgFmNmFi>

## 这是什么，为什么要用它？

### CryptBoard 是一个加密剪贴板工具，可用于：

* 在不同计算机或设备之间复制和粘贴文本与文件
* 在没有直接数据共享方式的设备之间传输文本和文件

### CryptBoard 也是一个简单的加密网页聊天工具，它：

* 支持发送端到端加密消息
* 无需注册用户，因此保持一定程度的匿名性
* 防止服务器端解密消息内容

### CryptBoard 可以解决以下问题：

* 主操作系统与某些虚拟机来宾系统之间无法复制和粘贴文本
* 主操作系统与某些远程控制系统之间无法复制和粘贴文本（如 Remote Desktop、VMware Horizon 等）
* 缺少一个简单工具来安全传输密码等敏感信息

## 加密是如何工作的？

* CryptBoard 使用客户端侧的 RSA + AES 混合加密
* 使用 CryptBoard 时，客户端会向服务器发起匿名授权请求，并获取一个随机 UID
* 每条消息都会使用随机 AES 密钥（256 位）进行加密
* 该随机 AES 密钥会使用接收方的 RSA 公钥加密后发送到服务器
* 接收方从服务器取到消息后，会先用自己的 RSA 私钥解密 AES 密钥，再解密消息内容
* 用户之间会共享 UID 和 RSA 公钥，但私钥绝不会共享给服务器或其他客户端
* 密钥可以通过二维码或专用链接分享
* 可以通过查看根据公钥和 UID 哈希生成的头像，直观检查公钥与 UID 的完整性

## 本项目使用的工具和库

* 前端基于 HTML + CSS + JavaScript
  * [jQuery](https://jquery.com)
  * [Bootstrap](https://getbootstrap.com)
  * [Font Awesome](https://fontawesome.com)
  * [ArcticModal](https://arcticlab.ru/arcticmodal/)
  * [VanillaJS QRCode generator](https://github.com/chuckfairy/VanillaQR.js)
  * [Clipboard.js](https://github.com/zenorocha/clipboard.js)
  * [IndexedDB Lock mutex](https://github.com/robertknight/idb-mutex)
* RSA 加密由 [JSEncrypt](https://github.com/travist/jsencrypt) 实现
* AES 加密与密钥生成由 [Forge](https://github.com/digitalbazaar/forge) 实现
* 头像生成工具为 [Avataaars](https://getavataaars.com) 及其 [VanillaJS 版本](https://github.com/HB0N0/AvataaarsJs)
* 浏览器 Broadcast Channels polyfill 由 [BroadcastChannel](https://github.com/pubkey/broadcast-channel) 库提供
* 文件下载功能由 [FileSaver.js](https://github.com/eligrey/FileSaver.js/) 提供

## 源代码

* 源代码发布于：<https://github.com/MihanEntalpo/cryptboard.io>
