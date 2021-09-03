<?php 
$parsedown = new Parsedown();

echo $parsedown->text(file_get_contents(__DIR__ . "/../text/en_us/security.md")); 