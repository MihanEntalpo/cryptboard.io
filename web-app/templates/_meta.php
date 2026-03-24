<?php
$meta = array_merge([
    "og_title" => "",
    "og_type" => "",
    "og_url" => "",
    "og_image" => "",
], $context['meta'] ?? []);
?>
<meta property="og:title" content="<?php echo htmlspecialchars($meta['og_title'], ENT_QUOTES, 'UTF-8');?>" />
<meta property="og:type"  content="<?php echo htmlspecialchars($meta['og_type'], ENT_QUOTES, 'UTF-8');?>" />
<meta property="og:url"   content="<?php echo htmlspecialchars($meta['og_url'], ENT_QUOTES, 'UTF-8');?>" />
<meta property="og:image" content="<?php echo htmlspecialchars($meta['og_image'], ENT_QUOTES, 'UTF-8');?>" />
