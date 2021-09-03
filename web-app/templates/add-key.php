<h1>Add new key</h1>

<div class="alert alert-warning">To mitigate MiTM security risk, after entering uid and public_key please compare avatar with your conterpart!</div>

<form>
   <div class="mb-3" id='top-add-key-block'>
    <label for="add_name" class="form-label">Name</label>
    <input type="text" class="form-control" id="add_name" onkeyup="lib.ui.add_key.validate()" onchange="lib.ui.add_key.validate()" autocomplete="off">
    <div id="add_uid_err" class="invalid-feedback">
        Name should be any non-empty string
    </div>
  </div>
  <div class="mb-3">
    <label for="add_uid" class="form-label">Uid</label>
    <input type="text" class="form-control" id="add_uid" onkeyup="lib.ui.add_key.validate()" onchange="lib.ui.add_key.validate()" autocomplete="off">
    <div id="add_uid_err" class="invalid-feedback">
        Uid should be a valud UUID number
    </div>
  </div>
  <div class="mb-3">
    <label for="add_public_key" class="form-label">Public key</label>
    <textarea class="form-control" id="add_public_key" rows="8" autocomplete="off" onkeyup="lib.ui.add_key.validate()" onchange="lib.ui.add_key.validate()" ></textarea>
    <div id="add_public_key_err" class="invalid-feedback">
        Public key should be in format of OpenSSL public key
    </div>
  </div>
  <div class="mb-3 form-check form-switch">
    <input class="form-check-input" type="checkbox" id="add_send_my_key">
    <label class="form-check-label" for="add_send_my_key">Send my key back</label>
  </div>
  <div class="mb-3 form-check form-switch">
    <input type="checkbox" class="form-check-input" id="add_send_all_keys">
    <label class="form-check-label" for="add_send_all_keys">Share all my receivers</label>
  </div>
    <button type="button" id='add_key_button' class="btn btn-primary" onclick="lib.ui.add_key.do_add(this); return false;">
        <span class='loading'><i class='fa fa-spin fa-cog'></i>Adding key...</span>
        <span class='idle'>Add key</span>
    </button>
</form>

