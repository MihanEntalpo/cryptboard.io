<nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
    <div class="container-fluid">
        <a class="navbar-brand" href="/">CryptBoard.io</a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>

        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <a class="nav-link" href="/share-key" data-tab="share-key">Share key</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/clipboard" data-tab="clipboard">Clipboard</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="/add-key" data-tab="add-key">Add key</a>
            </li>
            <li class="nav-item active">
              <a class="nav-link" href="/about" data-tab="about">About</a>
            </li>
            <li class="nav-item active">
              <a class="nav-link" href="/security" data-tab="security">Security</a>
            </li>
          </ul> 
            <ul class="nav navbar-nav navbar-right">
                <li class="nav-item active">
                    <a class="nav-link" id="self-destruct" href="/" title='Kill session and start new' onclick='lib.client.kill_session()'><i class='fa fa-skull-crossbones'></i></a>
                  </li>

            </ul>
        </div>
    </div>
</nav>