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

**Installation:**

1. Clone repo.

```bash
git clone git@github.com:MihanEntalpo/cryptboard.io.git
```

2. Install docker and docker-compose

Installation of docker described at https://docs.docker.com/get-docker/

Installation of docker-compose described at https://docs.docker.com/compose/install/

3. Create config file

```bash
cp web-app/.env.docker.example web-app/.env.docker
```

4. Generate public and private keys for usage with JWT:

Run command:

```bash
ssh-keygen -t rsa -b 2048 -f jwtRS256.key -N ""
```

Files jwtRS256.key and jwtRS256.key.pub would be created.

5. Put contents of the files to .env.docker

Content of the files should be put in one-liners with "\n" string joining splitted lines, and put it to JWT_PUBLIC_KEY and JWT_PRIVATE_KEY variables.

To make it simple just run the following bash command:

Fill JWT_PRIVATE_KEY in .env.docker:
```bash
LINE=$(cat ./web-app/jwtRS256.key | tr '\n' '$' | sed 's|\$|\\\\n|g;s|^|JWT_PRIVATE_KEY=|g'); sed -i "s|^JWT_PRIVATE_KEY.*|$LINE|g" -i ./web-app/.env.docker
```

Fill JWT_PUBLIC_KEY in .env.docker:
```bash
LINE=$(cat ./web-app/jwtRS256.key.pub | tr '\n' '$' | sed 's|\$|\\\\n|g;s|^|JWT_PUBLIC_KEY=|g'); sed -i "s|^JWT_PUBLIC_KEY.*|$LINE|g" -i ./web-app/.env.docker
```

6. Fill some other variables

SERVER_HOST should be set to your HTTP host configured in Nginx or any other reverse-proxy server.

On official app this variable is set to cryptboard.io

SERVER_PORT should be a port, that is opened from docker container with running app


7. Build docker imaged

```bash
./build-docker-images.sh
```

8. Run docker-compose cluster:

```bash
./docker-compose.sh up -d
```

All normal docker-compose commands could be used with docker-compose.sh, for example:

So, instead of `docker-compose ps` you run `./docker-compose.sh ps` and so on.

This is just a simplification to use docker-compose without specifying docker-compose.yml file and .env.docker envfile for every call.

9. Check if application is running:

Open url http://127.0.0.1:{SERVER_PORT}/ in browser (You you are deploying app not locally, but on some online server, replace 127.0.0.1 by it's real IP)

10. Configure nginx to be a reverse-proxy to this local server and make it use SSL if needed (SSL keys could be obtained from LetsEncrypt)

Use conf/nginx/docker-proxypass.conf as a template for your docker config.

You will need to set the right hostname, proxy_pass port, logfiles location and letsencrypt key and cert files.

### Old good dockerless installation

Recommended for development

**Prerequisites:**

* Nginx
* Redis-server
* Php-fpm (version 7.0 and higher)
* Php-redis extension

**Installation:**

Instructions are made for deb-based distro:

1. Install needed packages

```bash
sudo apt-get install nginx-full php-fpm php-redis git
```

2. Clone repo

```bash
git clone git@github.com:MihanEntalpo/cryptboard.io.git
```

3. Create config file

```bash
cp web-app/.env.example web-app/.env
```

4. Generate public and private keys for usage with JWT:

Run command:

```bash
ssh-keygen -t rsa -b 2048 -f jwtRS256.key -N ""
```

Files jwtRS256.key and jwtRS256.key.pub would be created.

5. Put contents of the files to .env.docker

Content of the files should be put in one-liners with "\n" string joining splitted lines, and put it to JWT_PUBLIC_KEY and JWT_PRIVATE_KEY variables.

To make it simple just run the following bash command:

Fill JWT_PRIVATE_KEY in .env.docker:
```bash
LINE=$(cat ./web-app/jwtRS256.key | tr '\n' '$' | sed 's|\$|\\\\n|g;s|^|JWT_PRIVATE_KEY=|g'); sed -i "s|^JWT_PRIVATE_KEY.*|$LINE|g" -i ./web-app/.env
```

Fill JWT_PUBLIC_KEY in .env.docker:
```bash
LINE=$(cat ./web-app/jwtRS256.key.pub | tr '\n' '$' | sed 's|\$|\\\\n|g;s|^|JWT_PUBLIC_KEY=|g'); sed -i "s|^JWT_PUBLIC_KEY.*|$LINE|g" -i ./web-app/.env
```

6. Fill some other variables

SERVER_HOST should be set to your HTTP host configured in Nginx or any other reverse-proxy server.

On official app this variable is set to cryptboard.io

SERVER_PORT should be a port, that is opened from docker container with running app

7. Configure Nginx

Use file conf/nginx/dockerless.conf as a template for your configuration.

You should change:

server_name, SSL certificate and key, root folder and PHP fastcgi_pass url

8. Open site in browser and check if it's running.

If it's not, look for logs of nginx and php and check what should be changed.

