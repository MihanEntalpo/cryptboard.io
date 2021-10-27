FROM php:7.4-fpm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libssl-dev \
    libmcrypt-dev \
    unzip \
    mc \
    rsync \
    ssh \
  && rm -rf /var/lib/apt/lists/*

COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

RUN pecl install -o -f redis \
&&  rm -rf /tmp/pear \
&&  docker-php-ext-enable redis

RUN php -i | grep -i redis

RUN mkdir /web-app
COPY ./web-app/composer.json /web-app/composer.json
COPY ./web-app/composer.lock /web-app/composer.lock

RUN composer install -d /web-app

COPY ./web-app /web-app



