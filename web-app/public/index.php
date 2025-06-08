<?php

ini_set("display_errors", "On");

require_once(__DIR__ . "/../microfw/lib.php");

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function($e) {
    echo_error("internal_error", $e->getMessage());
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && ($error['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR))) {
        echo_error("internal_error", $error['message']);
    }
});

require_once(__DIR__ . "/../microfw/main.php");

require_once(__DIR__ . "/../app/controller.php");

Router::run();
