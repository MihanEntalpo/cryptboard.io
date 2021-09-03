<h1>Icons</h1>
<script>
$(function(){
    $('.icon-example svg > g').parent().parent().hide()
});
</script>

<?php
$file = __DIR__ . "/../public/fontawesome-free-5.15.3-web/css/all.css";


if (preg_match_all("#\.fa-(?P<name>[a-z0-9-]+):before \{#", file_get_contents($file), $matches, PREG_SET_ORDER))
{
    foreach($matches as $match)
    {
        $name = $match['name'];
        echo "<div class='icon-example'><i class='fa fa-${name}'></i>fa-${name}</div>";
    }
}
