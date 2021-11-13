<?php
require_once __DIR__ . "/../vendor/autoload.php";
require_once __DIR__ . "/lib.php";
require_once __DIR__ . "/route.php";
require_once __DIR__ . "/storage.php";
require_once __DIR__ . "/jwt.php";

if (get_conf("SENTRY_DSN"))
{
    \Sentry\init(['dsn' => get_conf("SENTRY_DSN") ]);
}