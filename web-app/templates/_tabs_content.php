<?php
$pages = [
    "about", "share-key", "clipboard", "add-key", "security"
];


foreach ($pages as $cur_page):
?>
<div class='tab <?=($cur_page == $page) ? "active" : ""?>' data-tab='<?=$cur_page?>'>
    <?=render($cur_page, "")?>
</div> 
<? 
endforeach;