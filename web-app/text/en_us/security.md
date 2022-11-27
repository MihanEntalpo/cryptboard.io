# CryptBoard Security

## How does CryptBoard work?

* Data is encrypted on a client-side (in browser) and decrypted also on the client-side (and could be done only by the right receiver)
* Data got transferred by a server in encrypted form and the server has no way to decrypt it
* After data got read by a client, it's destroyed on server immidiatelly.
* Client has anonymous authorization on the server, no client information is used for it except the IP address (used to prevent DOS attacks)
* Exchange of asymmetric public keys are happened by some third-party channel that you select

## How does encryption work in detail?

* Client anonymously authenticate on a server and get uid (unique UUID), used to send and get messages
* Hybrid encryption algorithm (RSA + AES) is used
* Client generating asymmetrical RSA key pair (public + private) of 1024 bit (Size of key is limited to keep browser usability. On slow devices 2048 bit key could be generating for minute or so)
* You are sharing your public key with another client by third-party channel such as:
    * Some internet messanger
    * By opening a QR-code using a mobile phone
    * Sending QR-code or link by a network storage
    * Sending by email
    * Publish on your website
* Private RSA key **never** leaves your browser and is not being transferred anywhere
* Public key not being sent to server, so in case of bad random generator on client side, it couldn't be used to compute private key.
* When a message is to be sent there are symmetrical AES key of 256 bit is generated and data gets encrypted by this key
* The AES key itself gets encrypted by the public RSA key of a receiver and added to the encrypted message string
* As you can have multiple receivers message gets encrypted separately for every receiver
* Since one need to have a private RSA key to decrypt the whole message and as it (the key) is not being sent anywhere, no one can decrypt the message except the legitimate receiver
* Encrypted data send to a server, specifying uid of the receiver, so the server could know who should get this message. Contents of a message are unknown to a server as it couldn't decrypt message.
* After the message got from the server by receiver client, the receiver first using its private key to decrypt AES key that was encrypted by the sender. After that AES key is used to decrypt the message payload.

## How can I trust CryptBoard?

* The application is intentionaly made very simple, JavaScript files are not minified and obfuscated, so you easily can see the code
* Main application file <a href='/js/frontend.js' target=_blank>frontend.js</a> and some other small files are easy to analyse. Search by a "private" word on in allows to see all the places there something happening to a private key. 
* Also in the future I'm planning to create some kind of "critical section" in code and move there all the work with keys, so it would be easier to analyze the code.
* There are OpenSource libraries used for encryption/decryption, namely JSEncrypt and Forge. I'm not a professional cryptographist so, relying on third-party analysis of these libraries (later will add links to papers)
* All the javascript modules are taken from official repositories and could be easily compared as specified in <a href='/about' class="simple">About</a>
* You don't have to trust a backend server at all, because all the project is made with the thought that server could be compromised and still not having an ability to decrypt messages.
* As source code is published, you can install your own server of cryptboard.io

## How to ensure maximum security using CryptBoard?

* When adding a new receiver's key and uid, check the avatar image. If you adding your own second device - just look at avatars, they should be equal.
* If you are adding other user's uid and key it's better to use voice call to manually describe what avatar you seeing and compare that your counterpart seeing the save. Avatar is generated based on sha256-hash of uid and public key, so any single-byte change leads to a completely different avatar.
* Also you can compare uid a public key itself, it's more complicated but also more secure
* Do not send messages to receivers whose public key you do not have if you are unsure. By default this is disabled but can be switched on (with a warning). Receiver without public key has question mark instead of avatar. **Messages to such receivers are not being encrypted.**
* After you finished working with the service clear all your data by using the "skull-and-bones" button on the upper panel (or in hamburger menu)
* Do not use a device that you cannot trust. But if You don't have a choice at least use Incognito mode in the browser and don't forget to clear all data after usage.

## What are possible security risks and how to mitigate them

* Man-In-The-Middle: if you somehow got uid and a public key that you didn't compare to your real receiver it could be used by a real owner to read messages you think you sending to someone else. So at least check avatar and if you're paranoid - also public key and uid.
* Code substitution: theoretically, after you've examined my application code and made yourself sure that it's safe, I (or any other hoster of the service) can secretly change it to make it vulnerable. The solution is to deploy your own server.
* Some errors or backdoors in Opensource encryption libraries: there is always a chance of it, so all we could is trust cryptography analysis and hope for the best
* Weak generated RSA encryption keys caused for example by lack of entropy on the device: in future, I'll make functionality to specify your own RSA keys, generated by OpenSSL
