<?php
$pages = [
    "about", "share-key", "clipboard", "add-key", "security"
];

foreach ($pages as $cur_page)
{
    ?>
    <div class='tab <?php echo ($cur_page == $page) ? "active" : ""?>' data-tab='<?php echo $cur_page?>'>
        <?php echo render($cur_page, "")?>
    </div> 
    <?php 
}
