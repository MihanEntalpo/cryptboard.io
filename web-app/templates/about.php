<?php 
$parsedown = new Parsedown();
$lang_dir = str_replace('-', '_', $context['lang'] ?? 'en-us');
$path = __DIR__ . '/../text/' . $lang_dir . '/about.md';
if (!file_exists($path)) {
    $path = __DIR__ . '/../text/en_us/about.md';
}
echo $parsedown->text(file_get_contents($path));
