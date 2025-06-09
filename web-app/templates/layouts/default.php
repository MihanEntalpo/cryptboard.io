<!DOCTYPE html>
<html lang="en">
    <head>
        
        <title>CryptBoard.io - encrypted web clipboard and anonymous chat</title>
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
        
        <script src="/js/env.js?hash=<?php echo md5_file_or_skip(__DIR__ . "/../../public/js/env.js")?>"></script>
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
