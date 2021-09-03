<h1>Share key</h1>

<div class="avatar" id="my-avatar" style='float:left;' title='Click to enlarge' onclick='lib.ui.receivers.window.open($(".uid-display").text());'></div>

<b>&larr;Your unique avatar</b><br>

<b>Your ID:</b> <span class="uid-display"></span><br>

<b>Share key by opening QR code:</b><br>

<br>

<div id="qrcode"></div><br>
<br>
<b>Or share key by sending link:</b>
<div class="input-group key-share-link-group">
  <input type="text" readonly id='share-link-input' class="form-control" placeholder="Key-share link" aria-label="Key-share link" aria-describedby="basic-addon2">
  
  <button class="btn btn-outline-secondary copy-to-clipboard" title='Copy to clipboard' type="button" data-clipboard-target="#share-link-input"><i class='fa fa-clipboard'></i></button>

</div>
<br><a id="share-link" href="#" target="_blank">Key share url</a>
<?php


