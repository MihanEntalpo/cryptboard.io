# CryptBoard — зашифрованный анонимный интернет-буфер обмена

> Это бета-версия. Если возникнут проблемы, можно связаться с разработчиком через [GitHub Issues](https://github.com/MihanEntalpo/cryptboard.io/issues) или в Telegram-чате: <https://t.me/joinchat/QZNQ2I35mgFmNmFi>

## Что это и зачем?

### CryptBoard — это зашифрованный буфер обмена для:

* Копирования и вставки текста и файлов между разными компьютерами и устройствами
* Обмена текстом и файлами между устройствами, у которых нет прямого способа передачи данных

### CryptBoard — это также простой зашифрованный веб-чат, который:

* Позволяет отправлять end-to-end зашифрованные сообщения
* Не требует регистрации пользователя, поэтому остаётся в некоторой степени анонимным
* Не позволяет расшифровать сообщения на стороне сервера

### CryptBoard решает следующие проблемы:

* Невозможность копировать и вставлять текст между основной ОС и некоторыми гостевыми ОС виртуальных машин
* Невозможность копировать и вставлять текст между основной ОС и некоторыми удалённо управляемыми системами (Remote Desktop, VMware Horizon и т. п.)
* Отсутствие простого инструмента для безопасной передачи секретов, например паролей

## Как работает шифрование?

* CryptBoard использует гибридное клиентское шифрование RSA + AES
* Для работы с CryptBoard клиент анонимно авторизуется на сервере и получает случайный UID
* Каждое сообщение шифруется случайным AES-ключом (256 бит)
* Этот случайный AES-ключ шифруется публичным RSA-ключом получателя и отправляется на сервер
* После получения сообщения с сервера получатель расшифровывает AES-ключ своим приватным RSA-ключом, а затем расшифровывает само сообщение
* Пользователи обмениваются UID и публичным RSA-ключом, но приватный ключ никогда не передаётся ни серверу, ни другим клиентам
* Ключами можно делиться через QR-код или специальную ссылку
* Целостность публичного ключа и UID можно визуально проверить по аватару, который строится из хеша UID и публичного ключа

## Инструменты и библиотеки, используемые в проекте

* Фронтенд на HTML + CSS + JavaScript
  * [jQuery](https://jquery.com)
  * [Bootstrap](https://getbootstrap.com)
  * [Font Awesome](https://fontawesome.com)
  * [ArcticModal](https://arcticlab.ru/arcticmodal/)
  * [VanillaJS QRCode generator](https://github.com/chuckfairy/VanillaQR.js)
  * [Clipboard.js](https://github.com/zenorocha/clipboard.js)
  * [IndexedDB Lock mutex](https://github.com/robertknight/idb-mutex)
* RSA-шифрование реализовано через [JSEncrypt](https://github.com/travist/jsencrypt)
* AES-шифрование и генерация ключей реализованы через [Forge](https://github.com/digitalbazaar/forge)
* Генератор аватаров — [Avataaars](https://getavataaars.com) и его [VanillaJS-версия](https://github.com/HB0N0/AvataaarsJs)
* Polyfill для Browser Broadcast Channels реализован библиотекой [BroadcastChannel](https://github.com/pubkey/broadcast-channel)
* Скачивание файлов реализовано через [FileSaver.js](https://github.com/eligrey/FileSaver.js/)

## Исходный код

* Исходный код опубликован здесь: <https://github.com/MihanEntalpo/cryptboard.io>
