<!DOCTYPE html>
<html lang="<?php echo htmlspecialchars($context['lang'] ?? 'en-us'); ?>">
    <head>
        <?php
            $translation_assets_hash = md5(implode('|', [
                md5(json_encode(get_supported_languages(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
                md5_file_or_skip(__DIR__ . "/../../public/js/translations/en-us.js"),
                md5_file_or_skip(__DIR__ . "/../../public/js/translations/ru-ru.js"),
                md5_file_or_skip(__DIR__ . "/../../public/js/translations/zh-cn.js"),
            ]));
        ?>
        
        <title>{CryptBoard.io - encrypted web clipboard and anonymous chat}</title>
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        
        <?php echo render("_meta", "");?>
        
        <script src="/js/libs/jquery-3.6.0.min.js"></script>
        <script src="/js/libs/popper.min.js"></script>
        <link rel="stylesheet" href="/bootstrap-5.0.2-dist/css/bootstrap.min.css" >
        <link rel="stylesheet" href="/css/jquery.arcticmodal.css" >
        <link rel="stylesheet" href="/css/style.css?hash=<?php echo md5_file_or_skip(__DIR__ . "/../../public/css/style.css")?>" >

        <script src="/js/libs/jsencrypt.js"></script>
        <script src="/fontawesome-free-5.15.3-web/js/all.js"></script>
        <script src="/js/libs/VanillaQR.min.js"></script>
        <script src="/js/libs/pako.min.js"></script>
        <script src="/js/libs/localforage.js"></script>
        <script src="/js/libs/broadcast-channel.min.js"></script>
        <script src="/js/libs/avataaars.js"></script>
        <script src="/js/libs/filesaver.js"></script>
        <script src="/js/libs/forge-sha256.min.js"></script>
        <script src='/js/libs/forge.min.js'></script>
        <script src="/js/libs/jquery.arcticmodal.js"></script>
        <script src="/js/libs/aes.js"></script>
        <script src="/js/libs/clipboard.js"></script>

        <script src='/bootstrap-5.0.2-dist/js/bootstrap.bundle.min.js'></script>

        <!-- Later we will implement openpgp encryption -->
        <!-- <script src="/js/openpgp.js"></script> -->
        

        <script>
        (function() {
            window.TR = window.TR || {};
            var storageKey = 'language';
            var cookieKey = 'lang';
            function normalize(code) {
                return (code || '').toLowerCase().replace(/_/g, '-');
            }
            function readStored() {
                try {
                    var raw = window.localStorage.getItem(storageKey);
                    if (!raw) { return ''; }
                    var parsed = JSON.parse(raw);
                    return normalize(parsed && parsed.data ? parsed.data : raw);
                } catch (e) {
                    return normalize(window.localStorage.getItem(storageKey));
                }
            }
            function readCookie() {
                var parts = document.cookie.split(';');
                for (var i = 0; i < parts.length; i++) {
                    var item = parts[i].trim();
                    if (item.indexOf(cookieKey + '=') === 0) {
                        return normalize(decodeURIComponent(item.substring(cookieKey.length + 1)));
                    }
                }
                return '';
            }
            function browserLocale() {
                var list = navigator.languages || [navigator.language || navigator.userLanguage || ''];
                for (var i = 0; i < list.length; i++) {
                    if (list[i]) return normalize(list[i]);
                }
                return 'en-us';
            }
            function syncLoad(src) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', src, false);
                xhr.send(null);
                if (xhr.status >= 200 && xhr.status < 300) {
                    window.eval(xhr.responseText + "\n//# sourceURL=" + src);
                    return true;
                }
                return false;
            }
            var translationAssetsHash = <?php echo json_encode($translation_assets_hash); ?>;
            if (!syncLoad('/js/translations/languages.js?hash=' + translationAssetsHash)) {
                return;
            }
            var available = window.TR_LANGUAGES || [];
            var availableMap = {};
            for (var i = 0; i < available.length; i++) {
                availableMap[available[i].code] = true;
            }
            var chosen = readStored() || readCookie() || browserLocale();
            if (!availableMap[chosen]) {
                var short = chosen.split('-')[0];
                for (var j = 0; j < available.length; j++) {
                    if (available[j].code.split('-')[0] === short) {
                        chosen = available[j].code;
                        break;
                    }
                }
            }
            if (!availableMap[chosen]) {
                chosen = 'en-us';
            }
            window.TR_LOCALE = chosen;
            syncLoad('/js/translations/' + chosen + '.js?hash=' + translationAssetsHash);
        })();
        </script>

        <script src="/js/env.js?hash=<?php echo time()?>"></script>
        <script src="/js/shared.js?hash=<?php echo md5_file_or_skip(__DIR__ . "/../../public/js/shared.js")?>"></script>
        <script src="/js/frontend.js?hash=<?php echo md5_file_or_skip(__DIR__ . "/../../public/js/frontend.js")?>"></script>

    </head>
    <body>

        <?php echo render("_popover", "")?>    

        <?php echo render("_menu", "")?>

        <main role="main" class="container-fluid">

          <?php echo $content; ?>

        </main>

    </body>
</html>
