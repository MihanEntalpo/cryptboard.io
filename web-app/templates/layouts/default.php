<!DOCTYPE html>
<html lang="en">
    <head>
        
        <title>CryptBoard.io - encrypted web clipboard and anonymous chat</title>
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        
        <script src="/js/libs/jquery-3.6.0.min.js"></script>
        <script src="/js/libs/popper.min.js"></script>
        <link rel="stylesheet" href="/bootstrap-5.0.2-dist/css/bootstrap.min.css" >
        <link rel="stylesheet" href="/css/jquery.arcticmodal.css" >
        <link rel="stylesheet" href="/css/style.css?hash=<?=md5_file(__DIR__ . "/../../public/css/style.css")?>" >

        <script src="/js/libs/jsencrypt.js"></script>
        <script src="/fontawesome-free-5.15.3-web/js/all.js"></script>
        <script src="/js/libs/qrcode.min.js"></script>
        <script src="/js/libs/pako.min.js"></script>
        <script src="/js/libs/jquery.ba-bbq.min.js"></script>
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
        
        <script src="/js/env.js?hash=<?=md5_file(__DIR__ . "/../../public/js/env.js")?>"></script>
        <script src="/js/main.js?hash=<?=md5_file(__DIR__ . "/../../public/js/main.js")?>"></script>

    </head>
    <body>

        <?=render("_popover", "")?>    

        <?=render("_menu", "")?>

        <main role="main" class="container-fluid">

          <?php echo $content; ?>

        </main>

    </body>
</html>
