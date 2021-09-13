# CryptBoard.io - anonymous encrypted web clipboard and char

Cryptboard.io allows to send text and files between multiple devices 

Website: https://cryptboard.io/

![Screenshot of a clipboard page](img/screenshot_1.png)

## Why would I need it?

* To copy and paste data/files between Host and Virtual machine where clipboard not supported
* To copy and paste data/files into Remote Desktop, such as VMWare Horizon, RDP, and others where clipboard doesn't work or is disabled
* To send valuable data such as passwords or some security keys and tokens without danger of it being intercepted
* To exchange information in a hostile environment where the server could be evil and yet not giving it a chance to decrypt messages
* Doing all this stuff without the need for registration

## Features

* Anonymous authorization on the server without the need for registration
* Hybrid RSA+AES encryption of data with asymmetric keys
* All sent data encrypted on the client and could not be decrypted on the server
* Clients adding each other to the "receivers list" by sending their public key and user ID using third-party channel
* Possible to share public key user ID by scanning QR-code
* Single button click to clear all client's data and keys and start a new session

## Disclaimers

* Application is on its beta stage so some bugs could be out where
* Application is written initially for my own use so code isn't perfect and would be refactored later
* Design and all the frontend is made by a backend programmer, so it could look quite ugly

## Usage of the official app

* After you opening https://cryptboard.io/ on any device, it automatically authorizes on the server and gets a user ID (uid)
* Also, private and public RSA keys are generated to use in the encryption/decryption process
* To start exchange text or files you have to share your uid and public key with another user (or device)
    * You can open QR-code on the "Share key" page with your mobile phone, and do "Add Key" from it
    * If you open two such QR-codes from the same mobile phone, and use the checkbox "Share all my receivers" (by default turned on on mobile), all of the keys would be shared between devices and your mobile phone
    * You can copy the link on the "Share key" page and send it over some other messenger or email
    * Also, you can copy QR code (make a screenshot) and send it over other messenger or email
* Device where your uid and the public key is added could automatically send its uid and public key back encrypted if the checkbox "Send my key back" is checked (by default it is)
* After uid and key is added you can send text or files back and forth between devices (or people)
* Avatars should be used to check if uid and the public key wasn't changed while traveling through third-party messenger

Details on secure usage could be found at https://cryptboard.io/#tab=security

## Deploying your own installation

### Docker installation

**Prerequisites:**

* Docker
* docker-compose
* Nginx on the host machine


