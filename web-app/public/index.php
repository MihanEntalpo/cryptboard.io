<?php

ini_set("display_errors", "On");

require_once(__DIR__ . "/../microfw/main.php");

require_once(__DIR__ . "/../app/controller.php");

Router::run();
