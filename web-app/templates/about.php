<h1>CryptBoard - encrypted anonymous internet clipboard</h1>

<div class='alert alert-warning'>This is a beta-version. In case of problems you can contact developer via <a href='https://github.com/MihanEntalpo/cryptboard.io/issues'>github issues</a> or in Telegram chat:<a href='https://t.me/joinchat/QZNQ2I35mgFmNmFi'>https://t.me/joinchat/QZNQ2I35mgFmNmFi</a></div>

<h2>What's that and why?</h1>

<h3>CryptBoard is an encrypted clipboard tool for:</h3>
<ul>
    <li>Copy and paste text and files between different computers/devices:</li>
    <li>Share text and files between devices that don't have direct data share methods</li>
</ul>

<h3>CryptBoard is also a simple encrypted webchat that:</h3>
<ul>
    <li>Allows to send end-to-end ecrypted messages</li>
    <li>Doesn't require user register, so it somewhat anonymous</li>
    <li>prevents messages being decrypted on server side</li>
</ul>

<h3>CryptBoard solves following problems:</h3>
<ul>
    <li>Inability to copy and paste text between main OS and some kinds of VM guest OSes</li>
    <li>Inability to copy and paste text between main OS and some remote controlled systems (RemoteDesktop, VmWareHorizon, and so on)
    <li>Absense of simple tool to securely send secrets like passwords</li>    
</ul>

<h2>How does encryption work</h2>

<ul>
    <li>CryptBoard uses client-side hybrid RSA+AES encryption</li>
    <li>To use CryptBoard, client makes anonymous authorization request to server, and acquires random UID from server.</li>
    <li>Every message is encrypted by AES with random key (256 bit) </li>
    <li>That random AES key is encrypted by public RSA key of a user, and sent to server</li>
    <li>After recipient gets message from server, it decrypts AES key by its RSA private_key, and then decodes AES-encoded message</li>
    <li>Users shares their UID and RSA public_key with each other, but private key is neither shared with server nor other clients</li>
    <li>Keys are shared by QR-code or special link. </li>
    <li>Integrity of public key and UID can be checked visually by inspecting the avatar generated from hash of public key and UID</li>
</ul>

<h2>Tools and libraries used in this project</h2>

<ul>
    <li>Frontend made on HTML + CSS + Javascript
        + <a href='https://jquery.com' target='_blank'>jQuery</a>
        + <a href='https://getbootstrap.com' target="_blank">Bootstrap</a>
        + <a href='https://fontawesome.com' target='_blank'>Fontawesome</a>
        + <a href='https://arcticlab.ru/arcticmodal/' target='_blank'>ArcticModal</a>
        + <a href='https://github.com/chuckfairy/VanillaQR.js' target='_blank'>VanillaJs QRCode generator</a>
        + <a href='https://github.com/zenorocha/clipboard.js' target="_blank">Clipboard.js</a>
        + <a href='https://github.com/robertknight/idb-mutex' target="_blank">IndexedDB Lock mutex</a>
    </li>
    <li>RSA encryption implemented by: <a href='https://github.com/travist/jsencrypt' target='_blank'>JSEncrypt library</a></li>
    <li>AES encryption and keys generation implemented by: <a href='https://github.com/digitalbazaar/forge' target='_blank'>Forge library</a></li>
    <li>Avatar generation tool is <a href='https://getavataaars.com' target="_blank">Avataaars</a> and its <a href='https://github.com/HB0N0/AvataaarsJs' target="_blank">VanillaJS version</a>
    <li>Browser Broadcast channels polyfill implemented by <a href='https://github.com/pubkey/broadcast-channel' target='_blank'>BroadcastChannel library</a></li>
    <li>File download functionality by <a target='_blank' href='https://github.com/eligrey/FileSaver.js/'>FileSaver.js</a></li>
</ul>

<h2>Source code</h2>

<ul>
    <li>
        Source code is published at <a href="https://github.com/MihanEntalpo/cryptboard.io">https://github.com/MihanEntalpo/cryptboard.io</a>
    </li>
</ul>
