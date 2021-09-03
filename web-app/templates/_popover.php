<div id="init-popover">
    <div class="inner-container">
        <center><h2>Initializing CryptBoard</h2></center>
    <ul class="init-items">
        <li name="get-lock">
            <span class="icon">
                <i class="fa fa-spin fa-cog"></i>
            </span>
            Acquiring crosstab lock
        </li>
        <li name="auth">
            <span class="icon">
                <i class="fa fa-spin fa-cog"></i>
            </span>
            Authorizing
        </li>
        <li name="keys">
            <span class="icon">
                <i class="fa fa-spin fa-cog"></i>
            </span>
            Encryption keys generating
            <ul class='keys-decision'>
                <li name='keys-read'>
                    <span class="icon">
                        <i class="fa fa-ellipsis-h"></i>
                    </span>
                    Reading from saved state
                </li>
                <li name='keys-await'>
                    <span class="icon">
                        <i class="fa fa-ellipsis-h"></i>
                    </span>
                    Awaiting from other tab
                </li>
                <li name='keys-generate'>
                    <span class="icon">
                        <i class="fa fa-ellipsis-h"></i>
                    </span>
                    Generating new pair
                </li>
            </ul>
        </li>
        <li name="done" style="display:none">
            <span class="icon">
                
            </span>
            Done
        </li>
    </ul>
    </div>
</div>
