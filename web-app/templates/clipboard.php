<h1>Clipboard</h1>
<div class="copy-button" id="single-copy-button"><button class="btn btn-success btn-sm" title="Copy all text" ><i class="fa fa-clipboard"></i> Ctrl+C</button></div>
<div class="container-fluid block-wrapper">
  <div class="row">
    <div class="col-8 messages-wrapper">
      Messages
      <div class='send'>
          <!--
          <div class='buttons'>
              <button type=button class='btn btn-sm btn-primary' id='send_file_button' 
                      title='Send file' 
                      onclick='lib.ui.msg.send_file_btn_click()'
                      ><i class='fa fa-paperclip idle'></i><i class='fa fa-spin fa-cog loading'></i></button><br>
              <button type=button class='btn btn-sm btn-success' id='send_text_button' 
                      title='Send message (Ctrl+Enter)' 
                      onclick='lib.ui.msg.send_btn_click()'
                      onkeydown='lib.ui.msg.send_ctrl_enter()'
                      ><i class='fa fa-arrow-circle-right idle'></i><i class='fa fa-spin fa-cog loading'></i></button>
              <input type="file"  style="display: none;" id="file-selector" multiple onchange="lib.ui.msg.send_file_selected(event, this)">
          </div>
          -->
          <div class='text'>
                <textarea name='text' id='text_to_send'></textarea>
          </div>
          <div class="horizontal-buttons">
              <button type="button" 
                      class="btn btn-sm btn-light" 
                      id="delete_all_msg" 
                      onclick='lib.ui.msg.delete_all()'
                      title="Delete all messages" 
                      style='float:left;'>
                  <i class='fa fa-trash-alt'></i>
              </button>
              <span class='grey-info'>Drag&drop file to the button&rarr;</span>
              <button type=button class='btn btn-sm btn-light' id='send_file_button' 
                      title='Send file' 
                      onclick='lib.ui.msg.send_file_btn_click()'
                      ondragover="lib.ui.msg.send_file_drop(event)"
                      ondrop="lib.ui.msg.send_file_drop(event)"
                      >
                      Send file
                      <i class='fa fa-paperclip idle'></i></button>
              <button type=button class='btn btn-sm btn-light' id='send_text_button' 
                      title='Send message (Ctrl+Enter)' 
                      onclick='lib.ui.msg.send_btn_click()'
                      onkeydown='lib.ui.msg.send_ctrl_enter()'
                      disabled
                      >
                      Send message <span class="grey">(enter)</span> <i class='fa fa-arrow-circle-right idle'></i>
                        </button>
              <input type="file"  style="display: none;" id="file-selector" multiple onchange="lib.ui.msg.send_file_selected(event, this)">
          </div>
      </div>
      <div class="messages">
          
      </div>      
    </div>  
    <div class="col-4 receivers-wrapper">
      Receivers
      <div class="receivers">          
      </div>
      <div class='row'>
          <div class='col'>
            <a href='/share-key' class='btn btn-success full-width'>Share my key</a>
          </div>
          <div class='col'>
            <a href='/add-key' class='btn btn-primary full-width'>Add key</a>
          </div>
      </div>
    </div>
  </div>
</div>