<?php

ini_set("display_errors", "On");

$_SERVER['REQUEST_URI'] = "/";

require_once(__DIR__ . "/../microfw/main.php");

require_once(__DIR__ . "/../app/controller.php");

Router::run();
