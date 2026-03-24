<?php 
$parsedown = new Parsedown();
$lang_dir = str_replace('-', '_', $context['lang'] ?? 'en-us');
$path = __DIR__ . '/../text/' . $lang_dir . '/security.md';
if (!file_exists($path)) {
    $path = __DIR__ . '/../text/en_us/security.md';
}
echo $parsedown->text(file_get_contents($path));
