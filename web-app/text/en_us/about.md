# CryptBoard - encrypted anonymous internet clipboard

> This is a beta version. In case of problems you can contact the developer via [GitHub Issues](https://github.com/MihanEntalpo/cryptboard.io/issues) or in Telegram chat: <https://t.me/joinchat/QZNQ2I35mgFmNmFi>

## What's that and why?

### CryptBoard is an encrypted clipboard tool for:

* Copying and pasting text and files between different computers/devices
* Sharing text and files between devices that don't have direct data sharing methods

### CryptBoard is also a simple encrypted web chat that:

* Allows sending end-to-end encrypted messages
* Doesn't require user registration, so it stays somewhat anonymous
* Prevents messages from being decrypted on the server side

### CryptBoard solves the following problems:

* Inability to copy and paste text between the main OS and some kinds of VM guest OSes
* Inability to copy and paste text between the main OS and some remote-controlled systems (Remote Desktop, VMware Horizon, and so on)
* Absence of a simple tool to securely send secrets like passwords

## How does encryption work?

* CryptBoard uses client-side hybrid RSA + AES encryption
* To use CryptBoard, the client makes an anonymous authorization request to the server and acquires a random UID from the server
* Every message is encrypted with a random AES key (256 bit)
* That random AES key is encrypted by the receiver's public RSA key and sent to the server
* After the recipient gets a message from the server, it decrypts the AES key with its RSA private key and then decodes the AES-encrypted message
* Users share their UID and RSA public key with each other, but the private key is never shared with the server or other clients
* Keys are shared by QR code or by a special link
* Integrity of the public key and UID can be checked visually by inspecting the avatar generated from the hash of the public key and UID

## Tools and libraries used in this project

* Frontend made with HTML + CSS + JavaScript
  * [jQuery](https://jquery.com)
  * [Bootstrap](https://getbootstrap.com)
  * [Font Awesome](https://fontawesome.com)
  * [ArcticModal](https://arcticlab.ru/arcticmodal/)
  * [VanillaJS QRCode generator](https://github.com/chuckfairy/VanillaQR.js)
  * [Clipboard.js](https://github.com/zenorocha/clipboard.js)
  * [IndexedDB Lock mutex](https://github.com/robertknight/idb-mutex)
* RSA encryption implemented by [JSEncrypt](https://github.com/travist/jsencrypt)
* AES encryption and key generation implemented by [Forge](https://github.com/digitalbazaar/forge)
* Avatar generation tool is [Avataaars](https://getavataaars.com) and its [VanillaJS version](https://github.com/HB0N0/AvataaarsJs)
* Browser Broadcast Channels polyfill implemented by the [BroadcastChannel library](https://github.com/pubkey/broadcast-channel)
* File download functionality by [FileSaver.js](https://github.com/eligrey/FileSaver.js/)

## Source code

* Source code is published at <https://github.com/MihanEntalpo/cryptboard.io>
