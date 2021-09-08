var helpers = {
    /**
     * Wrapper what make a promise-returning function out of any function
     * @param {function} func Function to wrap
     * @returns {function} wrapped function
     */
    make_promise: function(func) {
        var closure = function(){
            var args = arguments;

            return new Promise(function(resolve, reject){
                try
                {
                    var res = func.apply(this, args);
                    resolve(res);
                }
                catch (e)
                {
                    reject(e);
                }
            });
        };
        return closure;
    },
    /**
     * Defult promise reject handler. Used for debugging.
     */
    reject_handler: function(){
        console.error("Universal reject handler. Arguments:", arguments);
        console.trace();
    },
    /**
     * IntervalCaller class, calls function between intervals, not allowing to overlap two function calls
     * @param {function} func Function to run
     * @param {Integer} interval_ms Milliseconds between calls
     * @param {String} name Name of IntervalCaller instance
     * @param {Boolean} debug Is debug enabled?
     * @returns {IntervalCaller} instance of object
     */
    IntervalCaller: function(func, interval_ms, name, debug){
        
        if (!func) throw Error("func not set");
        if (!interval_ms) throw Error("interval_ms not set");
        if (!name) throw Error("name not set");
        
        var obj = this;
        
        obj.debug = debug ? true : false;
        obj.name = name;
        obj.func = func;
        obj.interval = null;
        obj.interval_ms = interval_ms;
        obj.in_progress = false;
        obj.go = function(){
            if (obj.in_progress) {
                if (obj.debug)
                {
                    console.log(obj.name + " handler already running");
                }
                return;
            }
            obj.in_progress = true;
            
            var res = obj.func(obj);
            
            Promise.resolve(res).then(function(res){
                obj.in_progress = false;
            }, function(err){
                obj.in_progress = false;
                helpers.reject_handler(err);
            });
        };
        obj.start = function(){
            obj.stop();
            obj.interval = setInterval(obj.go, obj.interval_ms);
        };
        obj.stop = function(){
            if (obj.interval)
            {
                clearInterval(obj.interval);
                obj.inteval = null;
            }
        };

        return this;
    },
    
};

/**
 * Main application code goes here
 */
var lib = {
    /**
     * Current version of code. If it differs from stored value, session would be cleared and restarted
     * @type String
     */
    current_version: "0.1.3",
    /**
     * Simple configuration parameters (values are function so it can be dinamically computable)
     */
    conf: {
        //Size of RSA key. Too large value make generation of key very long, and QR-code too complicated.
        key_size: function() { return 1024; },
        //Second after thich keys would expire (in localstorage)
        expire_delta_sec: function() { return 24 * 3600; }
    },
    core: {
        // Application main init function
        init: function(){
            
            lib.broadcast.init();
            lib.lock.init();
            
            var keys_events = {
                "before_get_keys": function(){ lib.ui.popover.set_li_icon("keys-read", "fa-cog fa-spin"); }, 
                "after_get_keys_ok": function(){ lib.ui.popover.set_li_icon("keys-read", "fa-check-square"); },
                "after_get_keys_err": function(){ lib.ui.popover.set_li_icon("keys-read", "fa-times-circle"); }, 
                "before_acquire": function(){ lib.ui.popover.set_li_icon("keys-await", "fa-cog fa-spin"); }, 
                "after_acquire_ok": function(){ lib.ui.popover.set_li_icon("keys-await", "fa-check-square"); }, 
                "after_acquire_err": function(){ lib.ui.popover.set_li_icon("keys-await", "fa-times-circle"); },
                "before_generate":function(){ lib.ui.popover.set_li_icon("keys-generate", "fa-cog fa-spin"); }, 
                "after_generate_ok":function(){ lib.ui.popover.set_li_icon("keys-generate", "fa-check-square"); }
            };
            
            Promise.all([
                lib.crypto.get_or_generate_keys(keys_events).then(function(res){
                    lib.ui.popover.set_li_icon("keys", "fa-check-square");
                }, helpers.reject_handler),
                lib.lock.get("initial-auth", 10000, 20000, 500, 100).then(function(){
                    lib.ui.popover.set_li_icon("get-lock", "fa-check-square");                    
                    
                    return lib.ajax.check_refresh_auth().then(function(res){
                        lib.ui.popover.set_li_icon("auth", "fa-check-square");                    
                    }).catch(function(err){
                        lib.ui.popover.set_li_icon("auth", "fa-exclamation-triangle");                                        
                    }).then(function(){
                        lib.lock.free("initial-auth");
                    })
                }).catch(function(){
                    lib.ui.popover.set_li_icon("get-lock", "fa-exclamation-triangle");   
                })
            ]).then(function(){
                $("#key-status").text("Your keys are generated");
                $("#key-status-info").text("Now, you can share public key with other user");

            }, helpers.reject_handler).then(function(){
                $('#init-popover li[name=done] > .icon').html("<i class='fa fa-check-square'></i>");
                $('#init-popover li[name=done]').fadeIn(800);
                return new Promise(function(ok, err) { 
                    setTimeout(function(){
                        $("#init-popover").fadeOut(800);
                        ok(true);
                    }, 800);
                });
            }, helpers.reject_handler).then(() => lib.receivers.add_myself(), helpers.reject_handler).then(function(){
                
                lib.tabs.init();
                
                lib.ui.draw.share_key();
                
                lib.tabs.on_hash_change();
                
                lib.msg.auto_checker_msg.start()
                
                lib.ui.draw.receivers(); 
                
                lib.ajax.auto_check_refresh_auth.start();
                
                lib.files.auto_send_file_processor.start();
                
                if (lib.core.is_version_changed())
                {
                    lib.modal.confirm(
                        "Version is changed", "Version is changed, need to reset all data and start again. Press OK",
                        function(){
                            lib.storage.set_local("lib_version", lib.current_version);
                            lib.client.kill_session();
                        }
                    );
                }
            }, helpers.reject_handler);

            function closingCode(){
               lib.crypto.unhide_private_key();
               return null;
            }
            window.onbeforeunload = closingCode;
            
            $("a").click(function(){
                var href = $(this).attr( "href" );
                if (href.indexOf("#") !== 0)
                {
                    return;
                }
                var parts = href.split("#", 2);
                if (parts.length === 1)
                {
                    parts.push("");                    
                }
                var params = $.deparam(parts[1]);

                // Push this URL "state" onto the history hash.
                $.bbq.pushState(params);

                $('.navbar-collapse.show').removeClass('show');

                // Prevent the default click behavior.
                return false;
            });
            
            $(window).bind( "hashchange", function(e) {
                var url = $.bbq.getState( "url" );
                lib.tabs.on_hash_change(url);
            });
            
            window.addEventListener('resize', function(event) {
                lib.ui.on_window_resize(event);
            }, true);
            
            $('#text_to_send').keydown(lib.ui.msg.send_ctrl_enter);
            $('#text_to_send').on("change keyup paste cut copy", lib.ui.msg.message_change);
            
            lib.clipboard.init();
        },
        /**
         * Check for versions change
         * @returns {Boolean}
         */
        is_version_changed: function(){
            var res = false;
            var saved_version = lib.storage.get_local("lib_version");
            if (saved_version && lib.tools.isString(saved_version))
            {
                if (saved_version != lib.current_version)
                {
                    res = true;
                }
            }
            else
            {
                lib.storage.set_local("lib_version", lib.current_version);
            }
            return res;
        }
    },
    /**
     * Browser's clipboard function library
     */
    clipboard: {
        obj: null,
        init: function(){
            lib.clipboard.obj = new ClipboardJS('.copy-to-clipboard');
            lib.clipboard.obj.on('success', lib.clipboard.on_success);
            lib.clipboard.obj.on('error', lib.clipboard.on_error);
        },
        on_success: function(e){
            console.log(e.trigger);
            var prev_title = $(e.trigger).attr('title');
            $(e.trigger).attr("title", "Copied to clipboard");
            $(e.trigger).tooltip({
                container: 'body',
                html: true,
                trigger: 'manual'
            }).tooltip('show');
            
            setTimeout(function () {
                $(e.trigger).tooltip('hide');
            }, 800);
            
            $(e.trigger).attr("title", prev_title);
            e.clearSelection();
        },
        on_error: function(e){
            console.error("Error while calling clipboard copy");
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
        }
    },
    /**
     * Library to take cross-tab lock (only single tab can get lock)
     */
    lock: {
        debug: false,
        /**
         * Initialization
         * @returns {undefined}
         */
        init: function(){
            lib.broadcast.add_listener("lock_already_taken", lib.lock.on_lock_already_taken_handler);
            lib.broadcast.add_listener("you_can_take_lock", lib.lock.on_you_can_take_lock_handler);  
            lib.broadcast.add_listener("can_i_take_lock", lib.lock.on_can_i_take_lock_handler);
        },
        acquired_locks: {},
        acquiring_process: {},
        /**
         * Acquire lock
         * @param {string} lock_name name of lock
         * @param {int} giveup_timeout How much time to wait for successfule actire (msec), default 2000
         * @param {int} release_timeout After what time lock should be automatically released, if it didn't happen manually (msec), default 20000
         * @param {int} await_timeout Interval to receive message "lock_already_taken" to not acquire lock (msec), default 500
         * @param {int} check_interval Interval to send broadcast message "can_i_take_lock" (msec), default 100
         * @param {Promise} promise that resolves then lock is taken
         */
        get: function(lock_name, giveup_timeout, release_timeout, await_timeout, check_interval){
            giveup_timeout = giveup_timeout || 2000;
            release_timeout = release_timeout || 20000;
            await_timeout = await_timeout || 500;
            check_interval = check_interval || 100;
            
            if (lib.lock.acquiring_process.hasOwnProperty(lock_name))
            {
                return lib.lock.acquiring_process[lock_name].promise;
            }
            
            if (lib.lock.acquired_locks.hasOwnProperty(lock_name))
            {
                return Promise.resolve(lock_name);
            }
            
            
            if (lib.lock.debug) console.log("lib.lock.get_lock(", lock_name , giveup_timeout, release_timeout, await_timeout, check_interval, ")");
            
            var do_check_lock = function(){
                var process = lib.lock.acquiring_process[lock_name];
                if (lib.lock.debug) console.log("lib.lock.get_lock(", lock_name , ") -> do_check_lock");
                lib.broadcast.post("can_i_take_lock", {
                    "lock_name": lock_name,
                    "start_time": process.start_time,
                    "rock_scissors_paper": process.rock_scissors_paper
                });
            };
            
            var do_giveup_lock = function(){
                var process = lib.lock.acquiring_process[lock_name];
                if (lib.lock.debug) console.log("lib.lock.get_lock(", lock_name , ") -> do_giveup_lock");

                clearTimeout(process.check_timeout_id);
                clearTimeout(process.await_timeout_id);
                clearTimeout(process.giveup_timeout_id);

                delete lib.lock.acquiring_process[lock_name];

                process.reject(lock_name);

            };
            
            var do_await_lock = function(){
                if (lib.lock.debug) console.log("lib.lock.get_lock(", lock_name , ") -> do_await_lock");
                var lock_take_success = false;
                var process = lib.lock.acquiring_process[lock_name];
                
                if (!process)
                {
                    return;
                }
                
                if (lib.lock.acquiring_process[lock_name].lock_taken_arrived)
                {
                    lock_take_success = false;
                }
                else
                {
                    lock_take_success = true;
                }
                
                if (lock_take_success)
                {
                    if (lib.lock.debug) console.log("lib.lock.get_lock(", lock_name , ") -> do_await_lock -> lock_take_success:true");
                
                    clearTimeout(process.check_timeout_id);
                    clearTimeout(process.await_timeout_id);
                    clearTimeout(process.giveup_timeout_id);
                    
                    delete lib.lock.acquiring_process[lock_name];
                    
                    lib.lock.acquired_locks[lock_name] = {
                        lock_name: lock_name,
                        free_lock_timeout_id: setTimeout(function(){
                            lib.lock.free(lock_name);
                        }, release_timeout)
                    };
                    
                    process.resolve(lock_name);
                }
                else
                {
                    if (lib.lock.debug) console.log("lib.lock.get_lock(", lock_name , ") -> do_await_lock -> lock_take_success:false");                    
                }
            };
            
            var promise = new Promise(function(resolve, reject){
                
                var obj = {
                    lock_name: lock_name,
                    promise: promise,
                    resolve: resolve,
                    reject: reject,
                    check_timeout_id: setTimeout(do_check_lock, check_interval),
                    await_timeout_id: setTimeout(do_await_lock, await_timeout),
                    giveup_timeout_id: setTimeout(do_giveup_lock, giveup_timeout),
                    lock_taken_arrived: false,
                    start_time: lib.date.timestamp(),
                    rock_scissors_paper: Math.floor(Math.random() * 1000000000)
                };
                
                lib.lock.acquiring_process[lock_name] = obj;
                
            });
            
            do_check_lock();
            
            return promise;
            
        },
        /**
         * Free previously acquired lock
         * @param {string} lock_name
         */
        free: function(lock_name) {
            if (lib.lock.debug) console.log("lib.lock.free(", lock_name , ")");
                
            if (lib.lock.acquired_locks.hasOwnProperty(lock_name))
            {
                clearTimeout(lib.lock.acquired_locks[lock_name].free_lock_timeout_id);
                delete lib.lock.acquired_locks[lock_name];
            }
        },
        /**
         * Acquire lock, then run callback, then automatically frees lock
         * @param {string} lock_name name of lock
         * @param {function} callback function to run after lock is taken
         * @param {int} giveup_timeout How much time to wait for successfule actire (msec), default 2000
         * @param {int} release_timeout After what time lock should be automatically released, if it didn't happen manually (msec), default 20000
         * @param {int} await_timeout Interval to receive message "lock_already_taken" to not acquire lock (msec), default 500
         * @param {int} check_interval Interval to send broadcast message "can_i_take_lock" (msec), default 100
         */
        with: function(lock_name, callback, giveup_timeout, release_timeout, await_timeout, check_interval) {
            lib.lock.get(lock_name, giveup_timeout, release_timeout, await_timeout, check_interval).then(function(){
                callback();
                lib.lock.free(lock_name);
            }, helpers.reject_handler)
        },
        /**
         * Analog of "with" function, but, takes function, that returns promise, and return it's promise, then, automatically frees lock
         */
        with_promise: function(lock_name, callback_returning_promise, giveup_timeout, release_timeout, await_timeout, check_interval) {
            if (lib.lock.debug) console.log("lib.lock.with_promise(", lock_name, ")");
            return lib.lock.get(lock_name, giveup_timeout, release_timeout, await_timeout, check_interval).then(function(){
                if (lib.lock.debug) console.log("callback_returning_promise (lock: ", lock_name, ") started");
                return callback_returning_promise().then(function(result){
                    if (lib.lock.debug) console.log("callback_returning_promise (lock: ", lock_name, ") finished, freeing lock");
                    lib.lock.free(lock_name);
                    return Promise.resolve(result);
                }).catch(function(err){
                    if (lib.lock.debug) console.log("callback_returning_promise (lock: ", lock_name, ") errored, freeing lock");
                    lib.lock.free(lock_name);
                    return Promise.reject(err);
                });
            }, helpers.reject_handler);
        },
        /**
         * Event handler what is called then other tab asks "can i take lock?"
         * @param {Object} data - data arrived from broadcast
         */
        on_can_i_take_lock_handler: function(data){
            if (lib.lock.debug) console.log("lib.lock.on_can_i_take_lock_handler(", data , ")");
            
            var lock_name = data['lock_name'];
            var start_time = data['start_time'];
            var rock_scissors_paper = data['rock_scissors_paper'];
            
            if (lib.lock.acquired_locks.hasOwnProperty(lock_name))
            {
                if (lib.lock.debug) console.log("lib.lock.on_can_i_take_lock_handler(", lock_name , ") -> acquire_locks exists");
                lib.broadcast.post("lock_already_taken", {"lock_name": lock_name});
            }
            else if (lib.lock.acquiring_process.hasOwnProperty(lock_name))
            {
                var process = lib.lock.acquiring_process[lock_name];
                
                if (lib.lock.debug) console.log("lib.lock.on_can_i_take_lock_handler(", lock_name , ") -> acquiring_process exists");
                if (lib.lock.debug) console.log("our process start_time:", process.start_time, ", their process start_time:", start_time);
                if (lib.lock.debug) console.log("our process rock_scissors_paper:", process.rock_scissors_paper, ", their process rock_scissors_paper:", rock_scissors_paper);
                
                
                if (process.start_time < start_time || (
                        process.start_time === start_time && process.rock_scissors_paper < rock_scissors_paper
                ))
                {
                    if (lib.lock.debug) console.log("lib.lock.get_lock(", lock_name , ") -> acquiring_process exists, and is yonger than arrived");
                    lib.broadcast.post("lock_already_taken", {
                        "lock_name": lock_name, 
                        "start_time": start_time, 
                        "rock_scissors_paper": process.rock_scissors_paper
                    });
                }
            }
            else
            {
                lib.broadcast.post("you_can_take_lock", {
                    "lock_name": lock_name, 
                    "start_time": start_time, 
                    "rock_scissors_paper": 1000000000
                });
            }
        },
        /**
         * Event handler that is called then other tab say "I've already taken the lock!"
         * @param {Object} data
         * @returns {undefined}
         */
        on_lock_already_taken_handler: function(data){            
            if (lib.lock.debug) console.log("lib.lock.on_lock_already_taken_handler(", data , ")");
            
            var lock_name = data['lock_name'];
            if (lib.lock.acquiring_process.hasOwnProperty(lock_name))
            {
                if (lib.lock.debug) console.log("lib.lock.on_lock_already_taken_handler(", data , ") -> lock_taken_arrived = true");
                lib.lock.acquiring_process[lock_name].lock_taken_arrived = true;
            }
        },
        /**
         * Event handler that is called than other tab say "Yes, you can take the lock"
         * @param {type} data
         * @returns {undefined}
         */
        on_you_can_take_lock_handler: function(data){
            
        }
    },
    /**
     * Cross-tab broadcast messaging and event system.
     * Allows to send messages between tabs of a single browser.
     * Used to share keys between tabs, or send signal to clear session on all tasks, if user asks so.
     * 
     * Based on browsers's BroadcastChannel, of BroadcastChannel2 (based on a library https://github.com/pubkey/broadcast-channel)
     * Safari browser doesn't support BroadcastChannel, so BroadcastChannel2 come to the rescue
     */
    broadcast: {
        channel: null,
        debug: false,
        /**
         * Initialize channel
         */
        init: function(){
            var bc = window.BroadcastChannel || window.BroadcastChannel2
            lib.broadcast.channel = new bc('cryptboard-main');
            lib.broadcast.channel.onmessage = lib.broadcast.receive_raw;
            lib.broadcast.set_default_listeners();
        },
        /**
         * Close channel
         */
        close: function(){
            lib.broadcast.channel.close();
        },
        /**
         * Send raw data to channel
         * @param {Object} message
         */
        post_raw: function(message)
        {
            lib.broadcast.channel.postMessage(message);
        },
        /**
         * Send data with specific type (type is used to detect event handler that should be called)
         * @param {string} type The type of message
         * @param {Object} data Data (could be empty)
         */
        post: function(type, data)
        {
            if (lib.broadcast.debug) console.log("broadcast.post(", type, data, ")");
            
            lib.broadcast.post_raw({
                "type": type,
                "data": data
            });
        },
        /**
         * Raw of data
         * Works universally on BroadcastChannel or BroadcastChannel2
         * @param {Event|Object} d 
         */
        receive_raw: function(d)
        {
            // If native BroadcastChannel used:
            if (d instanceof MessageEvent)
            {
                var raw_data = d.data;
            }
            // In IE, Safari:
            else
            {
                var raw_data = d;
            }
            
            var res = {
                "type": "unkown",
                "data": raw_data
            };
            
            if (raw_data)
            {
                if (raw_data.hasOwnProperty("type"))
                {
                    res['type'] = raw_data.type;
                }
                if (raw_data.hasOwnProperty("data"))
                {
                    res['data'] = raw_data.data;
                }
            }
            lib.broadcast.receive(res['type'], res['data']);
        },
        /**
         * Receiver of data with type and usefull payload. 
         * Detects what event listeners to call, and call them
         * @param {String} type
         * @param {Object} data
         */
        receive: function(type, data)
        {
            if (lib.broadcast.debug) console.log("broadcast.receive(", type, data, ")");
            var listeners = lib.broadcast.listeners[type];
            if (listeners)
            {
                for (var lid in listeners)
                {
                    if (lib.broadcast.debug) console.log("broadcast.listeners[", lid, "](", data, ")");
                    listeners[lid](data);
                }
            }
        },
        /**
         * Listeners would be added here
         */
        listeners: {
        },
        /**
         * Add event listener
         * @param {String} type - the type on which event handler would be called
         * @param {function} func - handler itself
         * @param {boolean} once - if true, handler would be removed after it's called
         * @param {type} timeout - if set there are timeout after that handler would be removed
         * @param {type} func_on_timeout - function that should be called when timeout happened
         * @param {type} func_check_once_need_to_be_cleaned - function to check input data to detect, if once-handler should be removed
         */
        add_listener: function(type, func, once, timeout, func_on_timeout, func_check_once_need_to_be_cleaned){
            once = once || false;
            timeout = timeout || -1;
            func_on_timeout = func_on_timeout || function(){};
            func_check_once_need_to_be_cleaned = func_check_once_need_to_be_cleaned || function(data) {return true;};
            
            lib.broadcast.listeners[type] = lib.broadcast.listeners[type] || {};
            
            do
            {
                var lid = "l" + lib.tools.randint(10000000,
                                                  100000000);                                           
            }
            while(lib.broadcast.listeners[type].hasOwnProperty(lid))
               
            var timeoutObjId = null;
              
            if (once)
            {
                if (timeout > 0)
                {
                    timeoutObjId = setTimeout(func_on_timeout, timeout);
                }
            }
            
            lib.broadcast.listeners[type][lid] = function(data){
                if (timeout > 0 && once)
                {
                    clearTimeout(timeoutObjId);
                }
                
                if (once && func_check_once_need_to_be_cleaned(data)) {
                    delete lib.broadcast.listeners[type][lid];
                }
                
                var res = func(data);
                
                return res;
            };
        },
        /**
         * Set default listeners that are used accross the app
         * @todo move it into lib.core.ini
         */
        set_default_listeners: function(){
            // If we got message "give me private key" - lets send private key back
            lib.broadcast.add_listener("give_me_private_key", function(data){
                lib.broadcast.post("take_private_key", {"private_key": lib.crypto.keys.private});                
            });
            
            // If we got message "take private key" - lets remember received private key as our own
            lib.broadcast.add_listener("take_private_key", function(data){
                if (data['private_key'])
                {
                    lib.crypto.keys['private'] = data['private_key'];
                }
            });
            
            // If we got message "kill session", let's do it!
            lib.broadcast.add_listener("kill_session", function(data){
                lib.client.kill_session();
            });
            
            
            lib.broadcast.add_listener("uid_changed", function(data){
                window.location.reload();
            });
            
            lib.broadcast.add_listener("keys_regenerated", function(data){
                window.location.reload();
            })
        },
        /**
         * Request private key from other tab.
         * Used if private key was hided from localstorage (lib.crypto.hide_private_key)
         * @param {integer} timeout - how many time to wait before giveup
         * @param {integer} retries - how many times to send "give_me_key" message
         * @returns {Promise}
         */
        request_private_key: function(timeout, retries){
            retries = retries || 3;
            timeout = timeout || 2000;
            var single_timeout = parseInt(timeout / retries);
            var retries_made = 0;
            
            return new Promise(function(resolve, reject){
                console.log("RPK: Promise is created")
                
                console.log("RPK: Creating timeout for single_retry");
                
                var timeout_id = null;
                
                var retry_give_me_key = function(){
                    console.log("RPK: retry_give_me_key()");
                    lib.broadcast.post("give_me_private_key", {});
                    console.log("RPK: posted give_me_private_key");
                    retries_made += 1;
                    if (retries_made > retries)
                    {
                        console.log(`RPK: as ${retries_made} > ${retries} clearing timeout`)
                        clearTimeout(timeout_id);
                        timeout_id = null;
                    }
                    else
                    {
                        console.log(`RPK: as ${retries_made} <= ${retries} resetting retry_give_me_key to be called after ${single_timeout} msec`);
                        timeout_id = setTimeout(retry_give_me_key, single_timeout);
                    }
                };
                
                retry_give_me_key();
                
                console.log("RPK: Adding 'take_private_key' listener");
                lib.broadcast.add_listener(
                    "take_private_key", 
                    //Success, data arrived!
                    function(data){
                        console.log("RPK: take_private_key arrived");
                        // If date really arrived
                        if ((data.hasOwnProperty("private_key") && !!data['private_key']))
                        {
                            console.log("RPK: take_private_key has real private_key! Clearing timeout, resolving Promise!");
                            //Clear timeout
                            clearTimeout(timeout_id);
                            timeout_id = null;
                            //finish promise
                            resolve(data);
                        }
                    }, true, timeout, 
                    //error, common timeout
                    function(){
                        console.log("RPK: take_private_key handler timeout happened. Clearing timeout, rejecting promise");
                        //Clear timeout
                        clearTimeout(timeout_id);
                        timeout_id = null;
                        //reject promise
                        reject(new Error("timeout"));
                    },
                    // Do we need to recet handler?
                    function(data){
                        console.log("RPK: checking for real private_key arrived for 'once' handler rmoval");
                        // If data really arrived - yes, we need
                        return (data.hasOwnProperty("private_key") && !!data['private_key']);
                    }
                );
            });
        }
    },
    /**
     * Library to generate avatars based on uid and public_key
     */
    avatar: {
        /**
         * Caching in runtime
         */
        all_variants_cached: null,
        params_by_str_cache: {},
        /**
         * Get all params that can be changes in avatar generation library.
         * @returns {Array}
         */
        get_changable_params: function(){
            return Avataaars.getEditableTypes().reverse();
        },
        /**
         * Create avatar from configured params
         * @param {Object} params
         * @returns {String} svg of avatar
         */
        create_svg_simple: function(params){
            return Avataaars.create(params);
        },
        /**
         * Get all variants of params
         * @returns {data}
         */
        get_all_variants: function(){
            if (lib.avatar.all_variants_cached === null)
            {
                var variants = [];
                var max_int = 1;
                Avataaars.getEditableTypes().forEach(function(x) { 
                    var v = {"param": x, "variants": Object.keys(Avataaars.paths[x]), n: Object.keys(Avataaars.paths[x]).length};
                    variants.push(v);
                    max_int = max_int * v.n;
                });
                var data = {max_int: max_int, variants: variants};
                lib.avatar.all_variants_cached = data;
            }
            return lib.avatar.all_variants_cached;
        },
        /**
         * Create SVG avatar by integer number
         * @param {INteger} number
         * @returns {String|lib.avatar.empty_avatar} SVG of avatar
         */
        create_svg_by_number: function(number){
            if (number === -1)
            {
                return lib.avatar.empty_avatar;
            }
            else
            {
                var params = lib.avatar.get_params_by_number(number);
                return lib.avatar.create_svg_simple(params);
            }
        },
        /**
         * Create SVG avatar by any string
         * @param {type} str
         * @returns {String}
         */
        create_svg_by_str: function(str){
            var params = lib.avatar.get_params_by_str(str);
            return lib.avatar.create_svg_simple(params);
        },
        /**
         * Create SVG avatar by uid and public_key
         * @param {string} uid 
         * @param {string} public_key
         * @returns {String} SVG avatar
         */
        create_svg_by_user: function(uid, public_key){
            return lib.avatar.create_svg_simple(lib.avatar.get_params_by_user(uid, public_key));
        },
        /**
         * Get params (for avatar rendering) by uid and public_key
         * @param {type} uid
         * @param {type} public_key
         * @returns {unresolved}
         */
        get_params_by_user: function(uid, public_key){
            var s = "uid:" + uid + ":key:" + lib.crypto.get_public_key_for_share(public_key);
            var params = lib.avatar.get_params_by_str(s);
            return params;
        },
        /**
         * Get integer number by uid and public_key
         * @param {type} uid
         * @param {type} public_key
         * @returns {Number} number
         */
        get_number_by_user: function(uid, public_key){
            if (uid && public_key && lib.crypto.validate_public_key(public_key))
            {
                var s = "uid:" + uid + ":key:" + lib.crypto.get_public_key_for_share(public_key)
                var hash = lib.crypto.sha256(s);
                var i = parseInt(hash.substring(0, 8), 16);
                return i;
            }
            else
            {
                return -1;
            }
        },
        /**
         * Get avatar params by string
         * @param {String} str
         */
        get_params_by_str: function(str){
            var hash = lib.crypto.sha256(str);
            if (!lib.avatar.params_by_str_cache[hash])
            {
                var i = parseInt(hash.substring(0, 8), 16);
                var params = lib.avatar.get_params_by_number(i);
                lib.avatar.params_by_str_cache[hash] = params;
            }
            return lib.avatar.params_by_str_cache[hash];
        },
        /**
         * Get params indexes by number
         * @param {Integer} number
         * @returns {Array}
         */
        get_params_indexes_by_number: function(number)
        {
            var all_v = lib.avatar.get_all_variants();
            var num_p = number % all_v.max_int;
            var lens = [];
            var values = [];
            var p = all_v.max_int;
            for (var i in all_v.variants) {
                var v = all_v.variants[i];
                p = p / all_v.variants[all_v.variants.length - i - 1].n;
                var part = parseInt(Math.floor(num_p / p).toFixed(0));
                num_p = num_p - part * p;
                lens.push(v.n);
                values.unshift(part);
            };
            return values;
        },
        /**
         * Get params by number
         * @param {Integer} number
         */
        get_params_by_number: function(number){
            
            var all_v = lib.avatar.get_all_variants();
            var values = lib.avatar.get_params_indexes_by_number(number);
            var ps = {};
            
            for (var i in values) {
                var v = all_v.variants[i];
                ps[v.param] = v.variants[values[i]];
            }
            return ps;
        },
        /**
         * Empty avatar SVG (question mark in a black circle)
         * @type String
         */
        empty_avatar: `
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="-2 -2 31.536 31.536" style="enable-background:new 0 0 29.536 29.536;" xml:space="preserve">
                <g>
                        <path d="M14.768,0C6.611,0,0,6.609,0,14.768c0,8.155,6.611,14.767,14.768,14.767s14.768-6.612,14.768-14.767   C29.535,6.609,22.924,0,14.768,0z M14.768,27.126c-6.828,0-12.361-5.532-12.361-12.359c0-6.828,5.533-12.362,12.361-12.362   c6.826,0,12.359,5.535,12.359,12.362C27.127,21.594,21.594,27.126,14.768,27.126z"/>
                        <path d="M14.385,19.337c-1.338,0-2.289,0.951-2.289,2.34c0,1.336,0.926,2.339,2.289,2.339c1.414,0,2.314-1.003,2.314-2.339   C16.672,20.288,15.771,19.337,14.385,19.337z"/>
                        <path d="M14.742,6.092c-1.824,0-3.34,0.513-4.293,1.053l0.875,2.804c0.668-0.462,1.697-0.772,2.545-0.772   c1.285,0.027,1.879,0.644,1.879,1.543c0,0.85-0.67,1.697-1.494,2.701c-1.156,1.364-1.594,2.701-1.516,4.012l0.025,0.669h3.42   v-0.463c-0.025-1.158,0.387-2.162,1.311-3.215c0.979-1.08,2.211-2.366,2.211-4.321C19.705,7.968,18.139,6.092,14.742,6.092z"/>
                </g>
            </svg>`
    },
    ui: {
        is_mobile: function(){
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
                (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.platform))) {
                 return true;
            }
            return false;
        },
        popover: {
            set_li_icon: function(li_name, icon_classes)
            {
                $('#init-popover li[name="' + li_name + '"] > .icon').html("<i class='fa " + icon_classes + "'></i>");
            }
        },
        on_window_resize: function(event) {
            lib.ui.share_key.update_qrcode_size();
        },
        msg: {
            enable_send_files: true,
            send_ctrl_enter: function(e){
                if (e.ctrlKey && e.keyCode === 13) {
                    lib.ui.msg.send_btn_click();
                }
                
            },
            message_change: function() {
                if (lib.tools.trim($('#text_to_send').val()) !== '')
                {
                    $('#send_text_button').prop("disabled", false);
                }
                else
                {
                    $('#send_text_button').prop("disabled", true);
                }
            },
            delete: function(msg_ids) {
                lib.modal.confirm("Delete message", "You are going to delete message", function(){
                    lib.msg.delete(msg_ids);
                });
            },
            send_btn_click: function(){
                var text = $('#text_to_send').val();
                if (!text) return;
                $('#text_to_send').prop('disabled', true);
                $('#send_text_button').prop('disabled', true);
                $('#send_file_button').prop('disabled', true);
                $('#send_text_button').addClass('loading');
                
                lib.msg.send_text(text).then(function(){
                    
                    $('#text_to_send').prop('disabled', false);
                    $('#send_text_button').prop('disabled', false);
                    $('#send_file_button').prop('disabled', false);
                    $('#send_text_button').removeClass('loading');
                    
                    $('#text_to_send').val("");
                    
                    $('#text_to_send').focus();

                }).catch(function(err){
                    
                    $('#text_to_send').prop('disabled', false);
                    $('#send_text_button').prop('disabled', false);
                    $('#send_file_button').prop('disabled', false);
                    $('#send_text_button').removeClass('loading');
                    
                    $('#text_to_send').val("");
                    
                    lib.modal.alert("Error", "Error on send message: " + JSON.stringify(err));
                    
                });
            },
            send_file_btn_click: function(){
                $('#file-selector').click();  
            },
            send_file_selected: function(event, element){
                if (lib.files.debug) console.log("send_file_selected", event);
                var files = [];
                for (var i in event.target.files)
                {
                    var f = event.target.files[i];
                    if (f.toString() === "[object File]")
                    {
                        f.index = i;
                        f.comment = "";
                        files.push(f);
                    }
                }
                
                if (files.length === 0) return;
                
                var file_lines = [];
                
                files.forEach(function(file){
                    
                    var file_too_large = file.size > lib.files.max_file_size;
                    var file_too_large_message = "<div class='text-danger'>File too large. Max size is:" + lib.tools.num_with_spaces(lib.files.max_file_size) + " bytes</div>";
                    
                    file_lines.push(`
                    <tr data-num='${file.index}' class='file-row'>
                        <td>
                            <input type=checkbox ${file_too_large ? '' : 'checked'} ${file_too_large ? 'disabled' : ''} class='file-select-checkbox' data-num='${file.index}'
                            onchange='$(this).'>
                        </td>
                        <td class=file-name-and-size>
                            ${file.name} <div class='file-size'>(${lib.tools.num_with_spaces(file.size)} bytes)</div>
                            ${file_too_large ? file_too_large_message : ""}
                        </td>
                    </tr>` + (file_too_large ? "" :
                    `<tr data-num='${file.index}' class='textarea-row'>
                        <td colspan=2>
                            <textarea class='file-comment' placeholder='File comment' data-num='${file.index}'></textarea>
                        </td>
                    </td>
                    `));
                });
                
                var content = `Select files to send:<Br>
                    <table class=files-select-table>
                    <tr><th><input type=checkbox checked class='file-select-checkbox-all'></th><th>File</th></tr>
                    ${file_lines.join("\n")}
                    </table>
                `;
                
                var modal = lib.modal.confirm("Send files", content, function(){
                    var files_to_send = [];
                    files.forEach(function(file){
                        var index = file.index;
                        var selected = $(modal).find(`.file-select-checkbox[data-num=${index}]`).prop('checked') && file.size <= lib.files.max_file_size;
                        var comment = $(modal).find(`textarea.file-comment[data-num=${index}]`).val();
                        if (selected)
                        {
                            file.comment = comment;
                            files_to_send.push(file);
                        }
                    });
                    
                    if (files_to_send.length)
                    {
                       lib.files.send_files(files_to_send); 
                    }
                });
                
                $(modal).find('.file-select-checkbox-all').change(function(event){
                    $(modal).find('.file-select-checkbox:not(:disabled)').prop('checked', $(event.target).prop('checked'));
                    $(modal).find('.ok-button').prop('disabled', $(modal).find('.file-select-checkbox:checked').length === 0);
                });
                
                $(modal).find('.file-select-checkbox').change(function(event){
                    $(modal).find('.ok-button').prop('disabled', $(modal).find('.file-select-checkbox:checked').length === 0);                    
                });
                
                $(modal).find('textarea.file-comment').focus(function () {
                    $(this).animate({ height: "4em" }, 500);
                });
                
            },
            types: {
                "unknown": {
                    "icon": "fa-question-circle",
                    "title": "Unsupported message type",
                    "renderer": false,
                    "parse_payload": helpers.make_promise(
                        function(msg, payload) {
                            msg['data'] = {};
                            return msg;
                        }
                    )
                },
                "test": {
                    "icon": "fa-stethoscope",
                    "title": "Testing (debug) message",
                    "renderer": false,
                    "parse_payload": helpers.make_promise(
                        function(msg, payload) {
                            msg['data'] = {};
                            msg['data']['text'] = payload['text'];
                            msg['data']['data'] = payload['data'];
                            return msg;
                        }
                    )
                },
                "text": {
                    "icon": "fa-comment",
                    "title": "Text message",
                    "renderer": function(msg){
                        return Promise.resolve(`
                            <div class='msg-content'>
                                <div class='text-container'>${lib.tools.escape(msg.data.text)}</div>
                            </div>
                        `);
                    },
                    "parse_payload": helpers.make_promise(
                        function(msg, payload) {
                            msg['data'] = {
                                'text': payload['text']
                            };
                            return msg;
                        }
                    )
                },
                "file": {
                    "icon": "fa-file-alt",
                    "title": "File attachment",
                    "renderer": function(msg) {
                        var is_loaded = msg['data']['is_loaded'] || false;
                        var is_stalled = msg['data']['is_stalled'] || false;
                        var is_cancelled = msg['data']['is_cancelled'] || false;
                        var is_corrupted = msg['data']['is_corrupted'] || false;
                        
                        var bytes_loaded = msg['data']['bytes_loaded'] || 0;
                        
                        var btn_onclick = "return false;";
                        
                        var btn_color = "text-secondary";
                        var file_name_block = `<b>${lib.tools.escape(msg.data.name)}</b>`;
                        
                        var comment = msg['data']['comment'];
                        
                        if (is_loaded)
                        {
                            var btn_icon = "fa fa-download";
                            var title = "Download file";
                            btn_color = "text-success";
                            btn_onclick = `lib.files.download_file("${msg.id}"); return false;`;
                            file_name_block = `<a href='#' onclick='${btn_onclick}'>${lib.tools.escape(msg.data.name)}</a>`;
                        }
                        else if (is_stalled)
                        {
                            var btn_icon = "fa fa-clock";
                            var title = "File loading is stalled";
                        }
                        else if (is_cancelled)
                        {
                            var btn_icon = "fa fa-times";
                            var title = "File loading is cancelled";
                        }
                        else if (is_corrupted)
                        {
                            var btn_icon = "fa fa-times";
                            var title = "File is corrupted";
                        }
                        else
                        {
                            var btn_icon = "fa fa-circle-notch fa-spin";
                            var title = "File is loading";
                        }
                        
                        var percent = (bytes_loaded / msg['data']['transfer_size'] * 100).toFixed(2);
                        
                        var comment_block = comment ? `<div class='text-container'>${lib.tools.escape(comment)}</div>` : '';
                        
                        var content = `<div class='file-content'>
                                            <div class='file-button ${is_loaded ? 'loaded' : ''} ${btn_color}' title='${title}' onclick='${btn_onclick}'>
                                                <div class='foreground'>
                                                    <i class='${btn_icon}'></i>
                                                </div>
                                                <div class='background'>
                                                    <i class='fa fa-file fa-3x'></i>
                                                </div>
                                            </div>                        
                                            <div class='file-text'>
                                                <div class='file-text-content'>
                                                    <div class='file-name'>
                                                    File ${file_name_block}<br>
                                                    </div>
                                                    <div class='file-size'>
                                                    size: ${lib.tools.escape(lib.tools.num_with_spaces(msg.data.size))} bytes (${percent}% loaded)
                                                    </div>
                                                </div>
                                            </div>
                                       </div>
                                       ${comment_block}
                        `;
                        return Promise.resolve(content);
                    },
                    "parse_payload": helpers.make_promise(
                        function(msg, payload) {
                            msg['data'] = {
                                "id": payload['id'],
                                "name": payload['name'],
                                "parts": payload['parts'],
                                "size": payload['size'],
                                "transfer_size": payload['transfer_size'],
                                "sha256": payload['sha256'],
                                "mime": payload['mime'],
                                "is_image": payload['is_image'],
                                'is_loaded': false,
                                "is_stalled": false,
                                "is_cancelled": false,
                                "is_corrupted": false,
                                'parts_messages_ids': [],
                                "blob_id": null,
                                "loading_started_ts": lib.date.timestamp(),
                                "bytes_loaded": 0,
                                "comment": payload['comment']
                            };
                            msg['need_processing'] = true;
                            
                            lib.storage.set_local("file:" + payload['id'] + ":parts_msg_ids", {});
                            
                            return lib.storage.set("file:" + payload['id'] + ":msg", msg['id']).then(
                                function(){ return msg; }, helpers.reject_handler
                            );
                        }
                    ),
                    "post_save": function(msg) {
                        return lib.files.update_file_parts(msg.data.id);
                    }
                },
                "add": {
                    "icon": "fa-key",
                    "title": "Add contact message",
                    "parse_payload": helpers.make_promise(
                        function(msg, payload) {
                            
                            msg['data'] = {
                                "uid": payload['uid'],
                                "public_key": payload['public_key'],
                            };

                            var uid_valid = (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload['uid']));
                            var public_key_valid = lib.crypto.validate_public_key(payload['public_key']);

                            if (uid_valid && public_key_valid)
                            {
                                lib.receivers.add_receiver(payload['uid'], payload['public_key']);                            
                            }
                            else
                            {
                                msg['state'] = 'broken';
                            }
                            
                            return msg;
                        }
                    ),
                    "renderer": helpers.make_promise(function(msg){
                        return `<div class='key-msg-content'>
                                    <b>Public key</b> from receiver <b>${msg.data.uid}</b>
                                </div>`
                    })
                },
                "image": {
                    "icon": "fa-image",
                    "title": "Image file attachment",
                    "parse_payload": helpers.make_promise(
                        function(msg, payload) {
                            msg['data'] = {};
                            return msg;
                        }
                    )
                },
                "audio": {
                    "icon": "fa-headphones",
                    "title": "Audio file attachment",
                    "parse_payload": helpers.make_promise(
                        function(msg, payload) {
                            msg['data'] = {};
                            return msg;
                        }
                    )
                },
                "file_part": {
                    "icon": "fa-file-alt",
                    "title": "File part",
                    "hidden": true,
                    "renderer": helpers.make_promise(function(msg) {
                        return `<div>${lib.tools.toJson(msg.data)}</div>`
                    }),
                    "parse_payload": function(msg, payload) {
                        
                        return lib.storage.get("file:" + payload['file_id'] + ":msg").then(function(file_msg_id){
                            
                            if (!file_msg_id)
                            {
                                console.log("file_part:" + payload['part_num'] + " arrived before it's file " + payload['file_id']);
                            }

                            var blob_id = "blob:file_id:" + payload['file_id'] + ":part_num:" + payload['part_num'];

                            msg['data'] = {
                                "file_id": payload['file_id'],
                                "blob_id": blob_id,
                                "part_num": payload['part_num'],
                                "transferred_bytes": payload['content'].length
                            };

                            var cur_ids = lib.storage.get_local("file:" + payload['file_id'] + ":parts_msg_ids");

                            var loaded_parts = [];

                            if (!cur_ids)
                            {
                                cur_ids = {};
                            }

                            cur_ids['part_num:' + payload['part_num']] = msg['id'];
                            lib.storage.set_local("file:" + payload['file_id'] + ":parts_msg_ids", cur_ids);                            

                            return lib.storage.set(
                                blob_id, payload['content']
                            ).then(function(){
                                return msg;
                            }, helpers.reject_handler);

                        });
                    },
                    "post_save": function(msg){
                        return lib.files.update_file_parts(msg['data']['file_id']);
                    }
                }
            },
            states: {
                "encrypted": {
                    "icon": "fa-lock",         
                    "color": "green",
                    "title": "Message came encrypted. Server couldn't see it contents."
                },
                "unencrypted": {
                    "icon": "fa-lock-open",     
                    "color":"red",
                    "title": "Message came unencrypted. Server saw it naked."
                },
                "broken": {
                    "icon": "fa-poop",  
                    "color":"brown",
                    "title": "Message is broken or malformed"
                }
            },
            "progress": {
                "processing": {
                    "icon": "fa-cog fa-spin",
                    "title": "Processing..."
                },
                "done": {
                    "icon": "fa-check",
                    "title": "Loaded"
                }
            },
            message_is_changed: function(msg_id){
                return lib.storage.get("msg:" + msg_id).then(function(msg){
                    return lib.ui.draw.get_single_message_code(msg).then(function(content){
                        lib.ui.call_if_cache_differs(".message#" + msg_id, content, function(){

                            if ($(".message#" + msg_id).length)
                            {
                                $(".message#" + msg_id).replaceWith(content)   
                            }
                            else
                            {
                                $(".messages").prepend(content);
                                $(".message#" + msg_id).slideDown(500);
                            }
                        });
                    }, helpers.reject_handler);
                }, helpers.reject_handler);
            }
        },
        receivers: {
            window: {
                current_modal: null,
                get_content: function(uid){
                    return lib.receivers.get_receiver(uid, false).then(function(receiver){
                        var avatar = lib.avatar.create_svg_by_number(receiver.data.avatar_number);
                        
                        if (receiver.public_key_valid)
                        {
                            var public_key_text = lib.tools.escape(receiver.public_key).replace(/\n/g, "<br>");
                        }
                        else
                        {
                            var public_key_text = '-----NOT KNOWN-----';
                        }
                        
                        if (receiver.data && receiver.data.is_self)
                        {
                            var name_field = `
                                Name:<br>
                                <div class="mb-3 input-group" >
                                    <input type="text" readonly class="form-control" id="receiver-name-field" name="receiver-name" value='${lib.tools.escape(receiver.name)}'>                                    
                                </div>
                            `;
                        }
                        else
                        {
                            var name_field = `
                                Name:<br>
                                <div class="input-group mb-3">
                                    <input type="text" readonly class="form-control" id="receiver-name-field" name="receiver-name" value='${lib.tools.escape(receiver.name)}'>
                                    <button class="btn btn-outline-secondary" title="Edit" type="button" onclick="lib.ui.receivers.on_rename_click(event, this, '${receiver.uid}')"><i class='fa fa-pen'></i></button>
                                </div>
                            `;
                        }
                        
                        var content = `
                            <div class='recevier-window'>
                                <form>
                                    UID:<br>
                                    <div class="mb-3 input-group" >
                                        <input type="text" readonly class="form-control" id="receiver-uid-field" name="receiver-uid" value='${lib.tools.escape(receiver.uid)}'>                                    
                                    </div>
                                    ${name_field}
                                    <div class="mb-3 input-group" >
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="receiver-send-field" ${receiver.data.send ? 'checked' : ''} 
                                                   onchange='lib.ui.receivers.on_send_check_changed(event, this, "${receiver.uid}")'>
                                            <label class="form-check-label" for="receiver-send-field">Send messages</label>
                                        </div>
                                    </div>
                                    <div class='big-avatar'>${avatar}</div>
                                    Public key:<br>
                                    <label>
                                        <div class='public-key-content'>${public_key_text}</div>
                                    </label>
                                </form>
                            </div>
                        `;
                        
                        return content;
                        
                    }, helpers.reject_handler);
                },
                open: function(uid){
                    lib.ui.receivers.window.get_content(uid).then(function(content){
                        lib.ui.receivers.window.current_modal = lib.modal.alert(`Receiver ${uid}`, content, function(){
                            lib.ui.receivers.window.current_modal = null;
                        });
                    }, helpers.reject_handler);
                },
                update_if_opened: function(uid) {
                    var modal = lib.ui.receivers.window.current_modal;
                    if (modal && $(modal).length && $(modal).find("#receiver-uid-field").val() == uid)
                    {
                        return lib.ui.receivers.window.get_content(uid).then(function(content){
                            $(modal).find('.recevier-window').replaceWith(content);
                        }, helpers.reject_handler);
                    }
                    else
                    {
                        return Promise.resolve();
                    }
                }
            },
            get_receiver_html_code: function(receiver, existing){
                var avatar_number = -1;
                var pencil = true;
                
                var send = receiver.data && receiver.data.send;
                var pencil = receiver.data && !receiver.data.is_self;
                var avatar_number = (receiver.data && receiver.data.avatar_number) || -1;
                
                var icon = `<div class=avatar onclick='lib.ui.receivers.window.open("${receiver.uid}");'>${lib.avatar.create_svg_by_number(avatar_number)}</div>`;
                
                var name = receiver.name || "Nameless";
                var style = (existing === false) ? 'display:none' : '';
                if (pencil)
                {
                    var pencil_icon = "<i class='fa fa-pen pencil-button'></i>";                    
                }
                else
                {
                    var pencil_icon = "";
                }
                
                if (send)
                {
                    var send_toggle = `
                        <i class='fa fa-check-square' title='Send to this receiver'></i>
                    `;
                }
                else
                {
                    var send_toggle = `
                        <i class='fa fa-check' title='Dont send to this receiver'></i>
                    `;
                }
                
                var send_checked = send ? "checked" : ""
                var danger = !(receiver.public_key && receiver.public_key_valid);
                var danger_css = danger ? "background-color: #fd6e0d; border-color: #fd6e0d; border-color: #feb786;" : "";
                var send_toggle = `
                    <div class='form-check form-switch' title='Send messages to this receiver?'>
                        <input type='checkbox' class='form-check-input' style='${danger_css}' id='send-check-${receiver.uid}' ${send_checked} onchange='lib.ui.receivers.on_send_check_changed(event, this, "${receiver.uid}")'>                        
                    </div>`;
                
                if (receiver.public_key && receiver.public_key_valid)
                {
                    var cls = "with_key";
                }
                else
                {
                    var cls = "without_key";
                }
                
                if (!receiver.data.is_self)
                {
                    var delete_btn = `<div class='delete' title='Delete receiver' onclick='lib.ui.receivers.on_delete_click(event, this, "${receiver['uid']}")'><i class='fa fa-window-close'></i></div>`
                }
                else
                {
                    var delete_btn = "";
                }
                
                var code = `
                    <div class='receiver ${cls}' style="${style}" id="${receiver.uid}">
                        <div class='icon'>${icon}</div>
                        <div class='info'>
                        <div class='name'>${lib.tools.escape(name)}<span class="edit-name" title='Rename receiver' onclick='lib.ui.receivers.on_rename_click(event, this, "${receiver['uid']}")'>${pencil_icon}</span></div>
                        <div class='uid'>${receiver['uid']}</div>
                        </div>
                        <div class='buttons'>
                            <div class='send-toggle'>${send_toggle}</div>
                            ${delete_btn}
                        </div>
                    </div>
                `;
                return code;
            },
            on_delete_click: function(event, element, uid){
                lib.modal.confirm(
                    "Delete receiver?", 
                    `Do you really want to delete receiver '${uid}'?<br> 
                    You won't be able to send messages to it, but not receiving from it`,
                    function(){
                        console.log("deleting receiver", uid);
                        lib.receivers.remove_receiver(uid);
                    }
                );
            },
            on_rename_click: function(event, element, uid){
                return lib.receivers.get_receiver(uid, true).then(function(receiver){
                    var modal = lib.modal.confirm("Rename receiver", `
                    Enter receiver name that you'd like:<br>
                    <input type='text' id='receiver-name-editor' value='${lib.tools.escape(receiver.name, true)}'>
                    `, function(){
                        var new_name = $("#receiver-name-editor").val();
                        receiver.name = new_name;
                        lib.receivers.update_receiver_obj(receiver);
                    })
                }, helpers.reject_handler);
            },
            on_send_check_changed: function(event, element, uid){
                var receiver_uid = uid;
                var checked = $(element).prop("checked");
                return lib.receivers.get_receiver(uid, false).then(function(receiver){
                    if (checked)
                    {
                        $(element).prop("checked", false);
                        if (!receiver.public_key || !receiver.public_key_valid)
                        {
                            lib.modal.confirm(
                                "Unprotected send!", 
                                `<i class='fa fa-x2 fa-exclamation-triangle' class='red'></i>Receiver ${receiver_uid} doesn't have a public key.<br>Your message would be send unencrypted.<br> Are your sure you want to enable it?`,
                                function(){
                                    $(element).prop("checked", true);
                                    receiver.data = $.extend(receiver.data || {}, {
                                        "send": true,
                                    })
                                    return lib.receivers.update_receiver_obj(receiver);
                                }
                            )
                        }
                        else
                        {
                            $(element).prop("checked", true);
                            receiver.data = $.extend(receiver.data || {}, {
                                "send": true,
                            })
                            return lib.receivers.update_receiver_obj(receiver);
                        }
                    }
                    else
                    {
                        receiver.data = $.extend(receiver.data || {}, {
                            "send": false,
                        })
                        return lib.receivers.update_receiver_obj(receiver);
                    }
                }, helpers.reject_handler);
            }
        },
        avatar: {
            large: function(el) {
                var svg = $(el).find('svg').parent().html();
                lib.modal.alert(`Avatar closer look`, "<div class='large-avatar'>" + svg + "</div>");
            }
        },
        html_blocks_cache: {},
        share_key: {
            update_qrcode_size: function(){
                var size = $(window).width() > 500 ? 500 : $(window).width() - 40;
            $('#qrcode').css({'width': size + "px", "height": size + "px"});
            $('#qrcode svg').css({'width': '100%', 'height':'100%'});
            }
        },
        call_if_cache_differs: function(cache_key, text, callable) {
            if (lib.ui.html_blocks_cache.hasOwnProperty(cache_key) && lib.ui.html_blocks_cache[cache_key] === text)
            {
                return;
            }
            else
            {
                callable();
                lib.ui.html_blocks_cache[cache_key] = text;
            }
        },
        add_key: {
            validate: function(){
                var uid = $("#add_uid").val();
                var public_key = $('#add_public_key').val();
                var name = $('#add_name').val();
                var valid = true;
                
                var uid_valid = (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid));
                if (uid_valid)
                {
                    $('#add_uid').addClass("is-valid");
                    $('#add_uid').removeClass("is-invalid");
                }
                else
                {
                    $('#add_uid').addClass("is-invalid");
                    $('#add_uid').removeClass("is-valid");                    
                }
                
                var name_valid = !/^\s*$/.test(name);
                if (name_valid)
                {
                    $('#add_name').addClass("is-valid");
                    $('#add_name').removeClass("is-invalid");
                }
                else
                {
                    $('#add_name').addClass("is-invalid");
                    $('#add_name').removeClass("is-valid");                    
                }
                
                var public_key_valid = lib.crypto.validate_public_key(public_key);
                
                if (public_key_valid)
                {
                    $('#add_public_key').addClass("is-valid");
                    $('#add_public_key').removeClass("is-invalid");
                }
                else
                {
                    $('#add_public_key').addClass("is-invalid");
                    $('#add_public_key').removeClass("is-valid");
                }
                
                valid = valid && uid_valid && public_key_valid && name_valid;
                
                $('#add_key_button').prop('disabled', !valid);
                
                if (valid)
                {
                    var icon = lib.avatar.create_svg_by_user(uid, public_key);
                    var icon_div = `<div class='avatar' onclick='lib.ui.avatar.large(this);'>${icon}</div>`;
                    if ($('#top-add-key-block .avatar').length === 0)
                    {
                        $('#top-add-key-block').prepend("<div class=avatar></div>");
                    }
                    $('#top-add-key-block .avatar').replaceWith(icon_div);
                }
                else
                {
                    if ($('#top-add-key-block .avatar').length !== 0)
                    {
                        $('#top-add-key-block .avatar').remove();
                    }
                }
                
                return valid;
            },
            do_add: function(){
                if (lib.ui.add_key.validate())
                {
                    $('#add_public_key').prop('disabled', true);
                    $('#add_uid').prop('disabled', true);
                    $('#add_key_button').prop('disabled', true);
                    $('#add_name').prop('disabled', true);
                    $('#add_key_button').addClass('loading');
                    
                    var uid = $("#add_uid").val();
                    var public_key = $('#add_public_key').val();
                    var name = $("#add_name").val();
                    
                    var icon = lib.avatar.create_svg_by_user(uid, public_key);
                    var icon_div = "<div class='avatar' onclick='lib.ui.receivers.window.open(\"" + uid + "\");'>" + icon + "</div>";
                    
                    var need_to_send_my_key = $('#add_send_my_key').prop("checked");
                    var need_to_send_all_keys = $('#add_send_all_keys').prop("checked");
                    
                    lib.receivers.update_receiver(uid, name, public_key, {
                        "icon": icon_div,
                        "avatar_number": lib.avatar.get_number_by_user(uid, public_key),
                        "send": true
                    }).then(function(){
                        $('#add_public_key').prop('disabled', false);
                        $('#add_uid').prop('disabled', false);
                        $('#add_key_button').prop('disabled', false);
                        $('#add_name').prop('disabled', false);
                        $('#add_key_button').removeClass('loading');
                        $('#add_uid').val("");
                        $('#add_public_key').val("");
                        $('#add_name').val("");
                        $('#top-add-key-block .avatar').remove();
                        lib.modal.alert('Key added', "Key successfully added", function(){
                            window.location.hash = "tab=clipboard";
                        });
                        if (need_to_send_my_key)
                        {
                            lib.msg.send_my_key([uid]);
                        }
                        if (need_to_send_all_keys)
                        {
                            lib.msg.send_all_keys();
                        }
                    }, helpers.reject_handler).then(function(){
                        lib.ui.draw.receivers();
                    }, helpers.reject_handler);
                }
            }
        },
        draw: {
            share_key: function(){
                var params_str = $.param({
                    "tab": "add-key",
                    "uid": lib.client.uid,
                    "key": lib.crypto.get_public_key_for_share()
                });

                var url = window.location.origin 
                            + "/#" + params_str;
                    
                var qrcode = new QRCode(document.getElementById("qrcode"), {
                    text: url,
                    colorDark:    "#000000",
                    colorLight:   "#ffffff",
                    colorBorder: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H,
                    // WARNING: when printing a QRcode on a DARK background, you MUST
                    // add a "quiet zone" around the QRcode for it to be properly
                    // recognized by all applications.
                    // Use a margin of 2 or more to accomplish this.
                    margin:       0,
                    overlayOptions: {
                            blockRatio: 0.4,
                    },
                    useSVG : 'false'
                });
                
                $('#my-avatar').html(lib.avatar.create_svg_by_user(lib.client.uid, lib.crypto.keys.public));
                
                $('#share-link').attr("href", url);
                $('#share-link-input').val(url);
                
                $('.uid-display').text(lib.client.uid);
                
                lib.ui.share_key.update_qrcode_size();
            },
            get_single_message_code: function(msg){
                
                var msg_content = "";

                var type = lib.ui.msg.types[msg['type']];
                var state = lib.ui.msg.states[msg['state']];

                var progress_state = msg['need_processing'] ? 'processing' : 'done';
                var progress = lib.ui.msg.progress[progress_state]

                var hidden = (type.hasOwnProperty('hidden') && type.hidden) || false;

                if (hidden)
                {
                    return Promise.resolve("");
                }

                var type_icon = `<i class="fa fa-xs ${type['icon']}" title='${type['title']}'></i>`;

                var state_icon = `<i class="fa fa-xs ${state['icon']}" 
                                     style='color:${state['color']}'
                                     title='${state['title']}'
                                    ></i>`;

                var progress_icon = `<i class="fa fa-xs ${progress['icon']}" title='${progress['title']}'></i>`

                var render_promise = null;

                if (msg['state'] !== "broken")
                {
                    if (type.hasOwnProperty('renderer') && type['renderer'] !== false)
                    {
                        render_promise = type['renderer'](msg);
                    }
                }

                if (render_promise === null)
                {
                    render_promise = Promise.resolve("");
                }

                return render_promise.then(function(msg_content){

                    var existing = $(".message#" + msg.id).length > 0;

                    var incoming = msg['incoming'];

                    var from = msg['from'];

                    var avatar_content = $('#' + from).find('svg').parent().html() || lib.avatar.empty_avatar;

                    var avatar_circle = `<div class="avatar-circle">${avatar_content}</div>`;

                    var content = `
                        <div class='message ${msg_content ? "contented" : "contentless"} ${incoming ? "incoming" : "outgoing"}' id="${msg.id}" style='${existing ? '' : 'display:none;'}'>
                            ${avatar_circle}
                            <div class='meta'>
                                <div class='type'>${type_icon}</div>
                                <div class='state'>${state_icon}</div>
                                <div class='processing'>${progress_icon}</div>
                            </div>
                            <div class='delete-button' title='Delete message' onclick='lib.ui.msg.delete(["${msg.id}"])'><i class='fa fa-times'></i></div>
                            ${msg_content}
                        </div>
                    `;
                    return content;
                }, helpers.reject_handler);
            },
            messages: function(){
                if (lib.msg.debug) console.log("drawing messages...");
                
                $('#send_file_button').prop("disabled", !lib.ui.msg.enable_send_files);
                
                return lib.msg.get_stored_ids().then(function(msg_ids){
                    if (lib.msg.debug) console.log("msg_ids to draw:", msg_ids);
                    
                    var existing_msgs = {};
                
                    $('.messages .message').each(function(i, el){
                        var id = $(el).attr("id");
                        existing_msgs[id]=true;                        
                    });
                    
                    if (lib.msg.debug) console.log("already drawen msg_ids:", existing_msgs);
                    
                    var read_promises = [];
                    
                    if (!msg_ids) msg_ids = [];
                    
                    msg_ids.forEach(function(msg_id){
                        
                        if (!existing_msgs.hasOwnProperty(msg_id))
                        {
                            read_promises.push(lib.storage.get("msg:" + msg_id));
                        }
                                               
                    });
                    
                    if (read_promises.length)
                    {
                        return Promise.all(read_promises).then(function(msgs){
                        
                            var msgs_by_id = {};

                            msgs.forEach(function(msg){
                                if (msg)
                                {
                                    msgs_by_id[msg['id']] = msg;
                                }
                            });

                            var render_promises = [];

                            msg_ids.forEach(function(msg_id){
                                var msg = msgs_by_id[msg_id];
                                
                                if (!msg || existing_msgs.hasOwnProperty(msg_id))
                                {
                                    return Promise.resolve();
                                }

                                lib.ui.draw.get_single_message_code(msg).then(function(content){
                                    lib.ui.call_if_cache_differs(".message#" + msg_id, content, function(){

                                        if ($(".message#" + msg_id).length)
                                        {
                                            $(".message#" + msg_id).replaceWith(content)   
                                        }
                                        else
                                        {
                                            $(".messages").prepend(content);
                                            $(".message#" + msg_id).slideDown(500);
                                        }
                                    }, helpers.reject_handler);
                                }, helpers.reject_handler);
                            });
                        }, helpers.reject_handler);
                    }
                    else
                    {
                        return Promise.resolve();
                    }
                    
                }, helpers.reject_handler);                
            },
            receivers: function(){
                
                return lib.receivers.get_all_receivers().then(function(all){
                    var load_receivers_promises = [];
                    for (var f in all)
                    {
                        if (all.hasOwnProperty(f))
                        {
                            load_receivers_promises.push(lib.receivers.get_receiver(f));
                        }
                    }
                    return Promise.all(load_receivers_promises).then(function(receivers){
                        var receivers_uids = {};
                        for (var i in receivers)
                        {
                            var r = receivers[i];
                            receivers_uids[r['uid']] = r['uid'];
                            var existing = ($('.receiver#' + r["uid"]).length > 0);
                            var code = lib.ui.receivers.get_receiver_html_code(r, existing);
                            if (existing)
                            {
                                lib.ui.call_if_cache_differs("receiver#" + r['uid'], code, function(){
                                    $('.receiver#' + r['uid']).replaceWith(code);                                    
                                });
                            }
                            else
                            {
                                lib.ui.call_if_cache_differs("receiver#" + r['uid'], code, function(){
                                    $('.receivers').prepend(code);
                                    $('.receiver#' + r['uid']).slideDown(500);
                                });
                            }
                            
                        }
                        
                        var all_existing = [];
                        $('.receivers .receiver').each(function(i, el) { all_existing.push($(el).attr('id')); });

                        all_existing.forEach(function(receiver_uid){
                            if (!receivers_uids.hasOwnProperty(receiver_uid))
                            {
                                $('.receiver#' + receiver_uid).slideUp(500);
                            }
                        });
                        
                    }, helpers.reject_handler);
                }, helpers.reject_handler);
            },
            add_key: function(){
                return lib.storage.get("add_key_back", true).then(function(add_key_back){
                    return lib.storage.get("add_send_all_keys", lib.ui.is_mobile()).then(function(add_send_all_keys){
                        $('#add_send_my_key').prop("checked", !!add_key_back);
                        $('#add_send_all_keys').prop("checked", !!add_send_all_keys);
                        var hash = window.location.hash;
                        var params = $.deparam(hash);
                        if (params['uid'])
                        {
                            params['uid'] = params['uid'].replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
                            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params['uid']))
                            {
                                $('#add_uid').val(params['uid']);
                                $('#add_name').val("Nameless " + params['uid'].substring(0,4) + "..." + params['uid'].substring(params['uid'].length-5, params['uid'].length-1));
                            }
                        }
                        if (params['key'])
                        {
                            $('#add_public_key').val(lib.crypto.get_public_key_for_use(params['key']));
                        }
                        lib.ui.add_key.validate();
                    });
                }, helpers.reject_handler)
            }
        }
    },
    files: {
        debug: false,
        max_file_size: 1024 * 1024 * 10,
        file_part_size: 1024 * 200,
        update_file_parts: function(file_id){
            return Promise.resolve().then(function(){ 
                return lib.storage.get(
                    "file:" + file_id + ":msg"
                ).then(function(file_msg_id){
                    
                    if (!file_msg_id)
                    {
                        return Promise.resolve();
                    }
                    
                    return lib.storage.get(
                        "msg:" + file_msg_id
                    ).then(function(file_msg_obj){
                        
                        if (!file_msg_obj)
                        {
                            return Promise.resolve();
                        }
                        
                        if (lib.files.debug) console.log("file obj for part:", file_msg_obj);

                        var cur_ids = lib.storage.get_local("file:" + file_id + ":parts_msg_ids");
                        
                        var transferred_bytes = 0;
                        
                        return Promise.all(
                            Object.values(cur_ids).map(function(part_msg_id)
                                {
                                    return lib.storage.get("msg:" + part_msg_id);
                                }
                            )
                        ).then(function(parts){
                            parts.forEach(function(part){
                                transferred_bytes += part['data']['transferred_bytes'];
                            });
                        }, helpers.reject_handler).then(function(){
                            
                            file_msg_obj.data.bytes_loaded = transferred_bytes;
                            if (Object.keys(cur_ids).length === file_msg_obj.data.parts)
                            {
                                file_msg_obj.data.is_loaded = true;
                                file_msg_obj.need_processing = false;                                        
                            }
                            else
                            {
                                file_msg_obj['data']['bytes_loaded'] = transferred_bytes;                                        
                            }

                            file_msg_obj.data.parts_messages_ids = cur_ids;

                            var p = lib.storage.set("msg:" + file_msg_id, file_msg_obj).then(function(){
                                return lib.ui.msg.message_is_changed(file_msg_id);
                            }, helpers.reject_handler);

                            if (file_msg_obj.data.is_loaded)
                            {
                                return p.then(function(){ lib.files.plan_file_reconstruction(file_msg_id); }, helpers.reject_handler);
                            }
                            else
                            {
                                return p;
                            }
                        }, helpers.reject_handler);
                    }, helpers.reject_handler);
                }, helpers.reject_handler);
            }, helpers.reject_handler)
        },
        download_file: function(file_msg_uid){
            return lib.storage.get("msg:" + file_msg_uid).then(function(file_msg_obj){
                return lib.storage.get("blob:file_msg_id:" + file_msg_uid).then(function(file_contents){
                    if (lib.files.debug) console.log(file_msg_obj);
                    var bytearray = new Uint8Array(file_contents);
                    var blob =  new Blob([file_contents], {type: file_msg_obj.data.mime});
                    try
                    {
                        window.saveAs(file_contents, file_msg_obj.data.name);
                    }
                    catch (e)
                    {
                        if (e.message.indexOf("Overload resolution failed") !== -1)
                        {
                            lib.modal.alert("Error opening file", "It seems that file is too big to open in your browser");
                        }
                        else
                        {
                            throw e;
                        }
                    }
                }, helpers.reject_handler);
            }, helpers.reject_handler);
            
        },
        send_files: function(files){
            var skipped_files = {};
            var skip_causes = {
                "file_too_large": function(file) { 
                    return `File \`${file.name}\` is too large, it should be less than <b>${lib.tools.num_with_spaces(lib.files.max_file_size)}</b> bytes, but it's <b>${lib.tools.num_with_spaces(file.size)}</b>`;
                }
            };
            
            var add_promises = [];
            
            var create_err_catcher = function(file)
            {
                var err_catcher = function(e) {
                    if (skip_causes.hasOwnProperty(e.message))
                    {
                        if (!skipped_files.hasOwnProperty(e.message))
                        {
                            skipped_files[e.message] = [];
                        }
                        skipped_files[e.message].push(f);
                    }
                    else
                    {
                        throw e;
                    }
                };
                
                return err_catcher;
            };
            
            $('#send_file_button').prop("disabled", true);
            $('#send_file_button').addClass("loading");
            
            
            for(var i in files)
            {
                var f = files[i];
                
                add_promises.push(lib.files.add_file_to_send_queue(f).catch(create_err_catcher(f)));
                
            }
            
            Promise.all(add_promises).then(function(){
            
                if (Object.keys(skipped_files).length > 0)
                {
                    var msg = "";
                    for (var cause in skipped_files)
                    {
                        skipped_files[cause].forEach(function(file){
                            msg += skip_causes[cause](file) + "<br>";
                        });
                    }
                    lib.modal.alert("Some file couldn't be loaded", msg);
                }
                
                $('#send_file_button').prop("disabled", false);
                $('#send_file_button').removeClass("loading");
            
            }, helpers.reject_handler);
            
        },
        auto_send_file_processor: new helpers.IntervalCaller(function() {
            return lib.files.process_send_file_queue();
        }, 350, "auto_send_file_processor", false),
        process_send_file_queue: function(){
            var current_sending_files = lib.storage.get_local("current_sending_files", []);
            if (!current_sending_files || current_sending_files.length === 0) return;
            
            var parts_to_send = [];
            
            current_sending_files.forEach(function(file_id) 
            {
                if (lib.files.debug) console.log(file_id);
                var file_state = lib.storage.get_local("sending_file:" + file_id);
                if (!file_state) return;
                if (file_state.unsent_parts.length > 0)
                {
                    parts_to_send.push({
                        "part_name": "send_file:" + file_state.file_info.id + ":" + file_state.unsent_parts[0],
                        "file_id": file_state.file_info.id,
                        "part_num": file_state.unsent_parts[0]
                    });               
                }
                else
                {
                    if (lib.files.debug)console.log("File " + file_id + " successfully sent!");
                    lib.storage.del_local("sending_file:" + file_id);
                    current_sending_files.splice(current_sending_files.indexOf(file_id), 1);
                    lib.storage.set_local("current_sending_files", current_sending_files);
                }
            });
            
            var next_promise = Promise.resolve();
            
            parts_to_send.forEach(function(part_to_send){
                var part_name = part_to_send.part_name;
                var file_id = part_to_send.file_id;
                var part_num = part_to_send.part_num;
                next_promise = next_promise.then(lib.tools.promise_wait(lib.msg.interval)).then(function(){
                    if (lib.files.debug)console.log(`1. Reading part ${part_num} of ${file_id} (${part_name}) from storage`);
                    return lib.storage.get(part_name)
                }).then(function(part_data){
                    if (lib.files.debug)console.log(`2. Sending part ${part_num} of ${file_id} (${part_name})`);
                    return lib.msg.send_raw(part_data)
                }).then(function(){
                    if (lib.files.debug)console.log(`3. Removing part ${part_num} of ${file_id} (${part_name}) from storage`);
                    return lib.storage.del(part_name);                    
                }).then(function(){
                    if (lib.files.debug)console.log(`4. Removing part ${part_num} of ${file_id} (${part_name}) from file_state ${"sending_file:" + file_id}`);
                    var file_state = lib.storage.get_local("sending_file:" + file_id);
                    if (file_state)
                    {
                        file_state.sent_parts.push(file_state.unsent_parts.shift());
                        lib.storage.set_local("sending_file:" + file_id, file_state);
                    }
                    return Promise.resolve();
                });
            });
            
            return next_promise;
        },
        send_file_immidiatelly: function(file){
            
            return new Promise(function(resolve, reject){
                
                if (file.size > lib.files.max_file_size) 
                {
                    reject(Error("file_too_large"));
                    return;
                }

                var reader = new FileReader();

                if (lib.files.debug)console.log("Started to load file");

                reader.onload = function(e) {
                    var contents = e.target.result;
                    
                    var hash = lib.crypto.sha256(contents);
                    
                    if (lib.files.debug)console.log("File data sha256 hash:", hash)
                    
                    var part_length = lib.files.file_part_size;
                    var parts = Math.ceil(contents.length / part_length);
                    
                    var file_id = forge.util.encode64(lib.crypto.get_random_bytes(16));
                    
                    var file_main_package = {
                        "type": "file",
                        "id": file_id,
                        "name": file.name,
                        "parts": parts,
                        "size": file.size,
                        "transfer_size": contents.length,
                        "sha256": hash,
                        "mime": file.type,
                        "is_image": file.type.indexOf("image") !== -1
                    };
                    
                    
                    
                    if (lib.files.debug)console.log(`Sending file ${file.name}`);
                    var prev_promise = lib.msg.send_raw(file_main_package);
                    
                    var build_part_data = function(part_index){
                        var file_part_data = {
                            "type": "file_part",
                            "file_id": file_id,
                            "content": contents.slice(part_index * part_length, (part_index + 1) * part_length),
                            "part_num": part_index + 1
                        };
                        return file_part_data;
                    };
                    
                    prev_promise.then(lib.tools.promise_wait(lib.msg.interval)).then(function(){
                        
                        var prev_part_promise = Promise.resolve();
                        
                        var real_call = function(p_index, file_part_data) {
                            prev_part_promise = prev_part_promise.then(lib.tools.promise_wait(lib.msg.interval)).then(function(){
                                if (lib.files.debug)console.log(`Sending part ${p_index + 1} or ${parts}`);
                                return lib.msg.send_raw(file_part_data)
                            });
                        };
                        
                        for (var part_index=0; part_index < parts; part_index+=1)
                        {
                            var file_part_data = build_part_data(part_index);
                            
                            real_call(part_index, file_part_data);
                        }
                        
                        return prev_part_promise;
                        
                    }, helpers.reject_handler).then(function(){                        
                        if (lib.files.debug)console.log("File sent");
                        resolve();
                    }, helpers.reject_handler);
                    
                };
                reader.readAsDataURL(file);       
            
            });
        },
        add_file_to_send_queue: function(file){
            
            return new Promise(function(resolve, reject){
                
                if (file.size > lib.files.max_file_size) 
                {
                    reject(Error("file_too_large"));
                    return;
                }

                var reader = new FileReader();

                if (lib.files.debug)console.log("Started to load file");

                reader.onload = function(e) {
                    var contents = e.target.result;
                    
                    var hash = lib.crypto.sha256(contents)
                    
                    if (lib.files.debug)console.log("File data sha256 hash:", hash)
                    
                    var part_length = lib.files.file_part_size;
                    var parts = Math.ceil(contents.length / part_length);
                    
                    var file_id = forge.util.encode64(lib.crypto.get_random_bytes(15));
                    
                    var packages = {};
                    
                    var file_main_package = {
                        "type": "file",
                        "id": file_id,
                        "name": file.name,
                        "parts": parts,
                        "size": file.size,
                        "transfer_size": contents.length,
                        "sha256": hash,
                        "mime": file.type,
                        "is_image": file.type.indexOf("image") !== -1,
                        "comment": file.comment
                    };
                    
                    packages["part_num:0"] = file_main_package;
                    
                    var build_part_data = function(part_index){
                        var file_part_data = {
                            "type": "file_part",
                            "file_id": file_id,
                            "content": contents.slice(part_index * part_length, (part_index + 1) * part_length),
                            "part_num": part_index + 1
                        };
                        return file_part_data;
                    };

                    for (var part_index=0; part_index < parts; part_index+=1)
                    {
                        var part_data = build_part_data(part_index);
                        
                        packages["part_num:" + (part_index + 1)] = part_data;
                    }
                    
                    var promises = [];
                    for (var pn in packages)
                    {
                        if (packages.hasOwnProperty(pn))
                        {
                            promises.push(lib.storage.set("send_file:" + file_id + ":" + pn, packages[pn]));
                        }
                    }
                    
                    Promise.all(promises).then(function(){

                        var current_sending_files = lib.storage.get_local("current_sending_files", []);
                        if (!current_sending_files) 
                        {
                            current_sending_files = [];
                        }
                        current_sending_files.push(file_id);
                        lib.storage.set_local("current_sending_files", current_sending_files);
                        lib.storage.set_local("sending_file:" + file_id, {
                            "file_info": file_main_package,
                            "unsent_parts": Object.keys(packages),
                            "sent_parts": []
                        });
                        
                        resolve();

                    })
                    
                };
                  
                reader.readAsDataURL(file);       
            
            });
        },
        plan_file_reconstruction: function(file_msg_id) {
            setTimeout(
                function(){
                    lib.files.reconstruct_file_from_parts(file_msg_id);
                }, 1000
            );
        },
        reconstruct_file_from_parts: function(file_msg_id)
        {
            return lib.storage.get("msg:" + file_msg_id).then(function(file_msg_obj){
                if (lib.files.debug)console.log("RECONSTRUCTION FILE");
                if (lib.files.debug)console.log(file_msg_obj);
                var parts_messages_ids = file_msg_obj.data.parts_messages_ids;
                var blobs_promises = [];
                for (var i=0; i<file_msg_obj.data.parts; i++)
                {
                    blobs_promises.push(lib.storage.get("blob:file_id:" + file_msg_obj.data.id + ":part_num:" + (1 + i)));
                }
                return Promise.all(blobs_promises).then(function(blobs){
                    
                    var content = "";
                    
                    blobs.forEach(function(blob){
                        content += blob;
                    });
                    
                    var hash = lib.crypto.sha256(content);
                    
                    if (lib.files.debug)console.log("new content hash", hash);
                    
                    if (hash !== file_msg_obj.data.sha256)
                    {
                        if (lib.files.debug)console.log("File corrupted, sha256 hash wrong (", hash , " != ", file_msg_obj.data.sha256);
                        file_msg_obj.data.is_corrupted = true;
                        
                        return lib.storage.set(
                            "msg:" + file_msg_id, file_msg_obj
                        ).then(
                            function() { lib.files.clean_loading_artifacts(file_msg_id); }, helpers.reject_handler
                        ).then(function(){ 
                            lib.ui.msg.message_is_changed(file_msg_id); 
                        }, helpers.reject_handler);
                    }
                    else
                    {
                        return lib.storage.set(
                            "blob:file_msg_id:" + file_msg_id, content
                        ).then(
                            function() { lib.files.clean_loading_artifacts(file_msg_id); }, helpers.reject_handler
                        );
                    }
                }, helpers.reject_handler);                
            }, helpers.reject_handler);
        },
        clean_loading_artifacts: function(file_msg_id){
            
            return lib.storage.get("msg:" + file_msg_id).then(function(file_msg_obj){
                var store_ids_to_delete = [];
                var local_store_ids_to_delete = [];
                var msg_ids_to_delete = [];
                
                var cur_ids = lib.storage.get_local("file:" + file_msg_obj.data.id + ":parts_msg_ids");
                local_store_ids_to_delete.push("file:" + file_msg_obj.data.id + ":parts_msg_ids");
                
                for (var np in cur_ids)
                {
                    if (cur_ids.hasOwnProperty(np))
                    {
                        msg_ids_to_delete.push(cur_ids[np]);
                        store_ids_to_delete.push("blob:file_id:" + file_msg_obj.data.id + ":" + np);
                    }
                }
                
                
                if (lib.files.debug) console.log("local to delete:", local_store_ids_to_delete);
                if (lib.files.debug) console.log("store to delete:", store_ids_to_delete);
                if (lib.files.debug) console.log("messages to delete:", store_ids_to_delete);
                
                local_store_ids_to_delete.forEach(function(k){
                    lib.storage.del_local(k);
                });
                
                return Promise.all(
                    store_ids_to_delete.map(
                        (id)=>lib.storage.del(id)
                    )
                ).then(function(){
                    return lib.msg.delete(msg_ids_to_delete);
                });
            }, helpers.reject_handler);
        }
    },
    tools: {
        promise_wait: function(timeout) {
            var closure = function(res) {
                return new Promise(function(resolve, reject){
                    setTimeout(function(){
                        resolve(res);
                    }, timeout);
                });
            };
            return closure;
        },
        escape: function(text, escape_quotes) {
            if (!lib.tools.isString(text))
            {
                text = lib.tools.toJson(text);
            }
            escape_quotes = escape_quotes || false;
            text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (escape_quotes)
            {
                text = text.replace(/"/g, '&quot;').replace(/'/g, "&apos;");
            }
            return text;
        },
        num_with_spaces: function(x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        },
        isString: function(x){
            return (typeof x === 'string') || (x instanceof String);
        },
        isObject: function(x){
            return (
                typeof x === 'object' && x !== null && !lib.tools.isString(x)
            );
        },
        randint: function(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        },
        toJson: function(data) {
            var data_json = JSON.stringify(data);
            data_json  = data_json.replace(/[\u007F-\uFFFF]/g, function(chr) {
                return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
            });
            return data_json;
        },
        fromJson: function(data) {
            return JSON.parse(data);
        },
        trim: function(val) {
            return val.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    },
    tabs: {
        possible_tabs: [
            "about",
            "share-key",
            "add-key",
            "clipboard",
            "security"
        ],
        default_tab: "share-key",
        get_current_tab: function(url){
            url = url || window.location.href;
            var parts = url.split("#", 2);
            var hash_part = parts[1];
            if (hash_part)
            {
                var params = $.deparam(hash_part);
                var tab = params['tab'];
            }
            else
            {
                var tab = lib.tabs.default_tab;
            }
            return tab;
        },
        on_hash_change: function(url){
            lib.tabs.change_tab(lib.tabs.get_current_tab(url));
        },
        get_hash_params: function(){
            var hash = document.location.hash;
            var params = $.deparam(hash);
            return hash;
        },
        init: function(){
            var tab = lib.tabs.get_hash_params()["tab"];
            lib.tabs.change_tab(tab);
        },
        change_tab: function(tab)
        {
            if (!lib.tabs.possible_tabs.includes(tab))
            {
                tab = lib.tabs.default_tab;
            }
            $('div.tab').removeClass('active');
            $('div.tab[data-tab="' + tab + '"]').addClass('active');
            $('.nav-link').parent().removeClass("active");
            $('.nav-link[data-tab="' + tab + '"]').parent().addClass("active");
            $('.navbar-collapse.show').removeClass('show');
            if (lib.tabs.on_change_tab.hasOwnProperty(tab))
            {
                lib.tabs.on_change_tab[tab]();
            }
        },
        on_change_tab: {
            "add-key": function(){
                lib.ui.draw.add_key();
            }
        }
    },
    state: {
        page: ""
    },
    log: {
        error: function()
        {
            console.error.apply(this, arguments);
        },
        info: function()
        {
            console.info.apply(this, arguments);
        }
    },
    storage: {
        has_item: function(key) {
            return localforage.getItem(key).then(function(raw) {
                return (!(raw === null)) ? key : false;
            }, helpers.reject_handler);
        },
        get_local: function(key, def)
        {
            if (def === undefined)
            {
                def = null;
            }
            
            var raw = localStorage.getItem(key);
            var res = def;
            
            if (!!raw)
            {
                try
                {
                    var container = JSON.parse(raw);
                }
                catch(e)
                {
                    if (e.message.indexOf("JSON") >= 0)
                    {
                        lib.log.error("Key `" + key + "` is not JSON. Deleting.");
                        lib.storage.del_local(key);
                        return res;
                    }
                    else
                    {
                        throw e;
                    }
                }

                if (container !== undefined)
                {
                    var expire = container["expire"];
                    var data = container['data'];

                    if (data !== undefined && expire !==undefined)
                    {
                        if (Number.isInteger(expire))
                        {
                            if (lib.date.timestamp() <= expire)
                            {
                                res = data;
                            }
                        }
                        else if(expire === "never")
                        {
                            res = data;
                        } 
                        else
                        {
                            lib.log.error("Key `" + key + "` has non-'never' and non-integer expire value. Deleting.");
                            lib.storage.del_local(key);
                            return res;
                        }
                    }
                    else
                    {
                        lib.storage.del_local(key);
                        return res;                        
                    }
                }
            }

            return res;
        },
        get: function(key, def){
            
            if (def === undefined)
            {
                def = null;
            }
            
            return localforage.getItem(key).then(function(raw){
            
                var res = def;
            
                if (!!raw)
                {
                    var container = raw;

                    if (container !== undefined)
                    {
                        var expire = container["expire"];
                        var data = container['data'];

                        if (data !== undefined && expire !==undefined)
                        {
                            if (Number.isInteger(expire))
                            {
                                if (lib.date.timestamp() <= expire)
                                {
                                    res = data;
                                }
                            }
                            else if(expire === "never")
                            {
                                res = data;
                            } 
                            else
                            {
                                lib.log.error("Key `" + key + "` has non-'never' and non-integer expire value. Deleting.");
                                return lib.storage.del(key).then(function(){
                                    return def;
                                });
                            }
                        }
                        else
                        {
                            return lib.storage.del(key).then(function(){
                                return def;
                            });
                        }
                    }
                }
                
                return res;
            }, helpers.reject_handler);
            
        },
        set_local: function (key, value, expire_timeout){
            if (expire_timeout)
            {
                var expire = lib.date.timestamp() + expire_timeout;
            }
            else
            {
                var expire = "never";
            }
            var container = {
                "data": value,
                "expire": expire
            };
            localStorage.setItem(key, JSON.stringify(container));
        },
        set: function(key, value, expire_timeout)
        {
            if (expire_timeout)
            {
                var expire = lib.date.timestamp() + expire_timeout;
            }
            else
            {
                var expire = "never";
            }
            var container = {
                "data": value,
                "expire": expire
            };
            return localforage.setItem(key, container);
        },
        del_local: function(key){
            localStorage.removeItem(key);
        },
        del: function(key)
        {
            return localforage.removeItem(key);
        }
    },
    date: {
        timestamp: function(){
            return Date.now() / 1000 | 0;
        }
    },
    client: {
        uid: null,
        kill_session: function(){
            
            var destroy_local = function(){
                return localforage.clear().then(function(){
                    console.log("localForage cleared");
                    localStorage.clear();
                    console.log("localStorage cleared");
                    lib.client.uid = null;
                    lib.crypto.keys.private = null;
                    lib.crypto.keys.public = null;
                    console.log("keys and uid cleared");
                    lib.client.kill_session = function(){};
                    lib.broadcast.post("kill_session");
                    window.location.reload();
                }, helpers.reject_handler);
            };
            
            return lib.ajax.call("POST", "/clear").then(destroy_local).catch(destroy_local);
        },
        set_uid: function(uid)
        {
            return lib.storage.get("uid").then(function(old_uid){
                var uid_changed = false;
                if (old_uid && uid && old_uid !== uid)
                {
                    uid_changed = true;
                }
                lib.client.uid = uid;
                lib.storage.set("uid", uid).then(function(){
                    if (uid_changed)
                    {
                        return lib.client.uid_changed(old_uid, uid)
                    }
                });
            }, helpers.reject_handler);
        },
        uid_changed: function(old_uid, new_uid){
            lib.modal.alert("New UID", "Uid changed from " + old_uid + " to " + new_uid + "!<br>Receivers cleared.");
            return lib.receivers.get_all_receivers().then(function(receivers){
                var prs = [];
                for (var receiver_uid in receivers){
                    if (receivers.hasOwnProperty(receiver_uid))
                    {
                        prs.push(lib.storage.del("receiver:" + receiver_uid));
                    }
                }
                return Promise.all(prs).then(function(){
                    return lib.storage.del("all_receivers").then(function(){
                        return lib.ui.draw.receivers();
                    });
                });
            }, helpers.reject_handler).then(function(){
                return Promise.all(
                    [
                        lib.broadcast.post("uid_changed", {"uid": new_uid}),
                        lib.receivers.add_myself()
                    ]
                );
            }, helpers.reject_handler);
        }
    },
    convert: {
        parseJwt: function(token) {
            var base64Url = token.split('.')[1];
            var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        }
    },
    ajax: {
        debug: false,
        queue: [],
        last_queue_move: 0,
        init_queue_auto_move: function(){
            lib.ajax.queue_auto_move_interval = setInterval(lib.ajax.queue_auto_move, 500);
        },
        queue_auto_move_interval: null,
        call: function(method, url, data){
            if (lib.ajax.debug) console.log("lib.ajax.call", method, url, data);
            var promise = new Promise(function(resolve, reject){
                lib.ajax.queue.push(
                    {
                        "method": method,
                        "url": url,
                        "data": data,
                        "timeout": 0,
                        "promise": promise,
                        "resolve": resolve,
                        "reject": reject
                    }
                );
                if (lib.ajax.debug) console.log("lib.ajax.call added to queue, length:", lib.ajax.queue.length);
            });
            lib.ajax.move_queue();
            return promise;
        },
        move_queue: function(){
            
            lib.ajax.last_queue_move = new Date() / 1000;
            
            if (lib.ajax.queue.length === 0) return;
            
            var next_item = lib.ajax.queue.shift();
            
            if (lib.ajax.debug) console.log("lib.ajax.move_queue", next_item);
            
            return lib.storage.get("access_token").then(function(access_token){
                run_item = function(){
                    $.ajax(next_item.url, {
                        success: function(res){
                            if (!res['error'])
                            {
                                if (lib.ajax.debug) console.log("lib.ajax.move_queue", next_item, "success! resolving promise!");
                                next_item.resolve(res['data']);
                            }
                            else
                            {
                                if (res.error === "too_many_requests")
                                {
                                    if (next_item.timeout <= 0) 
                                    {
                                        next_item.timeout = 100;
                                    }
                                    else
                                    {
                                        next_item.timeout = parseInt(next_item.timeout * 1.5) + 1;
                                    }
                                    lib.ajax.queue.push(next_item);
                                    if (lib.ajax.debug) console.log("lib.ajax.move_queue", next_item, "too_many_requests! pushed back to queue! length:", lib.ajax.queue.length);
                                    return lib.ajax.move_queue();
                                }
                                else
                                {
                                    if (lib.ajax.debug) console.log("lib.ajax.move_queue", next_item, "error! rejecting promise!");
                                    console.error("Error on requesting " + next_item.url, res);
                                    next_item.reject(res);
                                }
                            }
                        },
                        headers: {
                            "Authorization": "Bearer " + access_token
                        },
                        error: function(res) {
                            if (lib.ajax.debug) console.log("lib.ajax.move_queue", next_item, "error! rejecting promise!");
                            console.error("Error on requesting " + next_item.url, res);
                            next_item.reject(res);
                        },
                        data: next_item.data,
                        method: next_item.method
                    });
                };

                if (next_item.timeout <= 0)
                {
                    run_item();
                }
                else
                {
                    setTimeout(run_item, next_item.timeout);
                }
                
                return next_item.promise;
            }, helpers.reject_handler);
        },
        queue_auto_move: function(){
            if (lib.date.timestamp() - lib.ajax.last_queue_move > 2000)
            {
                lib.ajax.move_queue();
            }
        },
        auth: function(){
            return lib.ajax.call("POST", "/auth").then(function(res){
                var access_token = res['access_token'];
                var refresh_token = res['refresh_token'];
                
                var access_payload = lib.convert.parseJwt(access_token);
                var refresh_payload = lib.convert.parseJwt(refresh_token);
                
                return lib.client.set_uid(access_payload['sub']).then(function(){
                    return Promise.all(
                        [
                            lib.storage.set("access_token", res['access_token'], access_payload['exp'] - lib.date.timestamp()),
                            lib.storage.set("refresh_token", res['refresh_token'], refresh_payload['exp'] - lib.date.timestamp())
                        ]
                    );
                });
            }).catch(function(err){
                lib.modal.alert("Auth error", "Error on authorization: " + JSON.stringify(err) + ", page would be reloaded", function(){
                    window.location.reload();
                });
                throw err;
            });
        },
        check: function(){
            return lib.ajax.call("POST", "/check").then(function(res){
                if (res['check'] === "ok")
                {
                    return lib.client.set_uid(res['uid']).then(function(){
                        return res['uid']
                    });
                }
                else
                {
                    throw new Error(res);
                }
            }).catch(function(err){
                console.log("check: Error:", err);
                throw err;
            })
        },
        refresh: function(){
            return lib.ajax.call("POST", "/refresh", {
                "refresh_token": lib.storage.get("refresh_token")
            }).then(function(res){
                var access_token_payload = lib.convert.parseJwt(res['access_token']);
                var refresh_token_payload = lib.convert.parseJwt(res['refresh_token']);
                
                return lib.client.set_uid(access_token_payload['sub']).then(function(){
                    return Promise.all(
                        [
                            lib.storage.set("access_token", res['access_token'], access_token_payload['exp'] - lib.date.timestamp()),
                            lib.storage.set("refresh_token", res['refresh_token'], refresh_token_payload['exp'] - lib.date.timestamp())
                        ]
                    );
                });
                
            }).catch(function(err){
                console.log("refresh: Error:", err)
                throw err;
            });
        },
        check_refresh: function(){
            return new Promise(function(resolve, reject){                
                lib.ajax.check().then(function(res) {
                    if (lib.ajax.debug) console.log("Token is correct");
                    resolve();
                }).catch(function(err) {
                    if (lib.ajax.debug) console.log("Token is incorrect, trying to refresh!")
                    lib.ajax.refresh().then(function(res) {
                        if (lib.ajax.debug) console.log("Token refreshed successfully!");
                        resolve();
                    }).catch(function(err) {
                        if (lib.ajax.debug) console.log("Token refreshment error:", err)
                        reject();                        
                    });
                });
            });
        },
        check_refresh_auth: function()
        {
            return new Promise(function(resolve, reject){                
                lib.ajax.check().then(function(res) {
                    if (lib.ajax.debug) console.log("Token is correct!");
                    resolve();
                }).catch(function(err) {
                    if (lib.ajax.debug) console.log("Token is incorrect, trying to refresh!")
                    lib.ajax.refresh().then(function(res) {
                        if (lib.ajax.debug) console.log("Token refreshed successfully!");
                        resolve()
                    }).catch(function(err) {
                        if (lib.ajax.debug) console.log("Token refreshment error:", err, ", trying to auth");
                        lib.ajax.auth().then(function(res) {
                            if (lib.ajax.debug) console.log("Auth successfull");
                            resolve();
                        }).catch(function(err) {
                            if (lib.ajax.debug) console.log("Auth error:", err);
                            reject();
                        });
                    });
                });
            });
        },
        auto_check_refresh_auth: helpers.IntervalCaller(function(){
            return lib.ajax.check_refresh_auth();
        }, 30000, "lib.ajax.auto_check_refresh_auth", true)        
    },
    receivers: {
        get_receiver: function(uid, auto_add) {
            auto_add = auto_add || false;
            return lib.storage.get("receiver:" + uid).then(function(receiver){
                if (!receiver)
                {
                    receiver = {
                        "uid": uid,
                        "name": "",
                        "public_key": "",
                        "data": {
                            "avatar_number": lib.avatar.get_number_by_user(uid, ""),
                            "send": false
                        }
                    };
                    
                    if (auto_add)
                    {
                        return lib.storage.set("receiver:" + uid, receiver).then(function(){
                            return lib.receivers.get_all_receivers().then(function(all){
                                if (!all.hasOwnProperty(uid) || all[uid] !== true)
                                {
                                    all[uid] = true;
                                    return lib.storage.set("all_receivers", all).then(function(){
                                        lib.receivers.receiver_changed(uid, receiver);
                                        return receiver;
                                    });
                                }
                                else
                                {
                                    lib.receivers.receiver_changed(uid, receiver);
                                    return receiver;
                                }
                            });
                        });
                    }
                    else
                    {
                        return receiver;
                    }
                }
                return receiver;
            }, helpers.reject_handler);
        },
        remove_receiver: function(uid){
            return lib.receivers.get_all_receivers().then(function(receivers){
                if (receivers.hasOwnProperty(uid))
                {
                    delete receivers[uid];
                }
                return lib.storage.set("all_receivers", receivers).then(function(){
                    return lib.storage.del("receiver:" + uid).then(function(){
                        lib.receivers.receiver_changed(uid, null);
                    });
                })

            }, helpers.reject_handler);
        },
        receiver_changed: function(uid, data){
            return Promise.all([
                lib.ui.receivers.window.update_if_opened(uid),
                lib.ui.draw.receivers()
            ]);            
        },
        update_receiver_obj: function(receiver_obj) {
            return lib.receivers.update_receiver(
                receiver_obj.uid,
                receiver_obj.name,
                receiver_obj.public_key,
                receiver_obj.data || {},
            );
        },
        update_receiver: function(uid, name, public_key, data) {
            name = name || null;
            public_key = public_key || null;
            return lib.receivers.get_receiver(uid, true).then(function(receiver){
                
                var old_receiver_str = JSON.stringify(receiver);
                
                if (name !== undefined)
                {
                    receiver['name'] = name;
                }
                if (public_key !== undefined)
                {
                    receiver['public_key'] = public_key;
                }
                if (data !== undefined)
                {
                    receiver['data'] = $.extend(receiver['data'], data);
                }
                
                receiver['public_key_valid'] = lib.crypto.validate_public_key(receiver['public_key']);
                
                var changed = (old_receiver_str !== JSON.stringify(receiver));
                
                if (changed)
                {
               
                    return lib.receivers.get_all_receivers().then(function(all_receivers){
                        if (!all_receivers)
                        {
                            all_receivers = {};
                        }
                        if (all_receivers[uid] !== true)
                        {
                            all_receivers[uid] = true;
                        }
                        return lib.storage.set("all_receivers", all_receivers).then(function(){
                            return lib.storage.set("receiver:" + uid, receiver).then(function(){
                                return lib.receivers.receiver_changed(uid, receiver);
                            });
                        })
                    }, helpers.reject_handler);

                }
                else
                {
                    return Promise.resolve();
                }
                     
            }, helpers.reject_handler);
        },
        get_all_receivers: function(){
            return lib.storage.get("all_receivers").then(function(receivers){
                if (!receivers)
                {
                    receivers = {};
                }
                return receivers;
            }, helpers.reject_handler);
        },
        load_all_receivers: function(only_uids){
            return lib.receivers.get_all_receivers().then(function(all){
                var load_receivers_promises = [];
                for (var f in all)
                {
                    if (!(only_uids && Array.isArray(only_uids) && only_uids.indexOf(f) === -1))
                    {
                        if (all.hasOwnProperty(f))
                        {
                            load_receivers_promises.push(lib.receivers.get_receiver(f));
                        }
                    }
                }
                return Promise.all(load_receivers_promises);
            }, helpers.reject_handler);
        },
        add_myself: function() {
            return lib.receivers.load_all_receivers().then(function(receivers){
                var delete_promises = [];
                receivers.forEach(function(receiver){
                    if (receiver.data.is_self)
                    {
                        if (receiver.uid !== lib.client.uid)
                        {
                            delete_promises.push(lib.receivers.remove_receiver(receiver.uid));
                        }
                    }
                });
                
                return Promise.all(delete_promises).then(function(){
                    return lib.receivers.add_receiver(lib.client.uid, lib.crypto.get_keys().public, "Myself", {"is_self": true, "send": true});            
                })
            }, helpers.reject_handler);
            
        },
        add_receiver: function(uid, public_key, name, data) {
            var icon = lib.avatar.create_svg_by_user(uid, public_key);
            var icon_div = "<div class='avatar'onclick='lib.ui.receivers.window.open(\"" + uid + "\");'>" + icon + "</div>";

            name = name || "Nameless " + uid.substring(0,4) + "..." + uid.substring(uid.length-5, uid.length-1);
            data = data || {};
            data = $.extend({
                "avatar_number": lib.avatar.get_number_by_user(uid, public_key),
                "icon": icon_div,
                "send": (public_key && lib.crypto.validate_public_key(public_key))
            }, data);
            
            return lib.receivers.update_receiver(uid, name, public_key, data);
        }
    },
    msg: {
        debug: false,
        interval: 100,
        get_id: function(msg_id) {
            return "msg:" + lib.client.uid + ":" + msg_id;
        },
        get_stored_ids: function() {
            return lib.storage.get("msgs:" + lib.client.uid);
        },
        add_stored_ids: function(ids) {
            return lib.msg.get_stored_ids().then(function(stored_ids){
                if (!Array.isArray(stored_ids))
                {
                    stored_ids = [];
                }
                ids.forEach(function(id) {
                    stored_ids.push(id);
                });
                lib.storage.set("msgs:" + lib.client.uid, stored_ids);
            }, helpers.reject_handler);
        },
        has_unread: false,
        processings: {},
        list: function(){
            return lib.ajax.call("POST", "/receive-list", {}).then(function(res){
                lib.msg.has_unread = res.length > 0;
                return res;
            }, helpers.reject_handler);
        },
        get: function(msg_ids){
            return lib.ajax.call("POST", "/receive", {"msg_ids": msg_ids}).then(function(res){
                return res;
            }, helpers.reject_handler);
        },
        delete: function(msg_ids){
            return lib.msg.get_stored_ids().then(function(ids){
                var ids_cleared = ids.filter(function(id){return msg_ids.indexOf(id) === -1;});
                return lib.storage.set("msgs:" + lib.client.uid, ids_cleared).then(function(){
                    var promises = [];
                    msg_ids.forEach(function(msg_id){
                        promises.push(lib.storage.del("msg:" + msg_id));

                        promises.push(lib.storage.del("uid:" + lib.client.uid + ":msg_id:" + msg_id));
                        
                        promises.push(lib.storage.del("blob:file_msg_id:" + msg_id));
                        
                        $(".message#" + msg_id).slideUp(500, function(){
                            $(".message#" + msg_id).remove();
                        });
                    });
                    return Promise.all(promises);
                });
            });
        },
        auto_checker_msg: new helpers.IntervalCaller(function(){
            return lib.msg.check_new_and_draw().catch(function(err){
                if (err !== "check_new already in progress")
                {
                    throw err;
                }
            });
        }, 2000, "lib.msg.new_auto_checker", true),
        send_raw: function(raw_payload, uids){
            return lib.receivers.load_all_receivers(uids).then(function(receivers) {
                
                var data = {
                    "msgs": []
                };
                
                receivers.forEach(function(receiver){
                    
                    if (receiver.data['send'])
                    {
                        var raw_data = {
                            "receiver": receiver.uid,
                            "payload": raw_payload
                        };

                        if (receiver.public_key)
                        {
                            raw_data.payload = lib.crypto.hybrid_encrypt_data(raw_data.payload, receiver.public_key);                        
                        }

                        data['msgs'].push(raw_data);
                    }
                });

                return lib.ajax.call("POST", "/send-multi", data).then(function(res){
                    var post_process_promises = [];
                    
                    res.forEach(function(res_item){
                       
                        var p = null;
                       
                        if (res_item)
                        {
                            if (!lib.tools.isString(res_item))
                            {
                                if (res_item.hasOwnProperty('status') && res_item.status === 500 && res_item.info === "receiver_not_found")
                                {
                                    var receiver_uid = res_item.receiver_uid;
                                    p = lib.receivers.remove_receiver(receiver_uid);                                    
                                }
                            }
                        }
                        
                        if (p === null) {
                            p = Promise.resolve();
                        }
                        
                        post_process_promises.push(p);
                        
                    });
                    
                    return Promise.all(post_process_promises);
                    
                }, helpers.reject_handler).then(function(){
                    return lib.msg.check_new_and_draw().catch(function(err){
                        if (err !== "check_new already in progress")
                        {
                            throw err;
                        }
                    });
                    
                }, helpers.reject_handler);
                
            }, helpers.reject_handler);
        },
        send_text: function(text, uids){
            return lib.msg.send_raw({
                "type": "text",
                "text": text                
            }, uids);
        },
        send_my_key: function(uids){
            return lib.msg.send_raw({
                "type": "add",
                "uid": lib.client.uid,
                "public_key": lib.crypto.get_keys().public
            }, uids);
        },
        send_all_keys: function(uids, send_to_me_also){
            send_to_me_also = send_to_me_also || false;
            var send_promises = [];
            lib.receivers.load_all_receivers(uids).then(function(receivers){
                var existing_uids = [];
                receivers.forEach(function(r){
                    if (!send_to_me_also && r.uid === lib.client.uid) 
                    {
                        return;
                    }
                    if (r.public_key)
                    {
                        existing_uids.push(r.uid);
                    }
                });
                receivers.forEach(function(r){
                    if (!send_to_me_also && r.uid === lib.client.uid) 
                    {
                        return;
                    }
                    if (r.public_key)
                    {
                        send_promises.push(
                            lib.msg.send_raw({
                                "type": "add",
                                "uid": r.uid,
                                "public_key": r.public_key
                            }, existing_uids)
                        );
                    }
                });
            }, helpers.reject_handler);
            return Promise.all(send_promises);
        },
        check_new: function(){
            if (lib.msg.checking_new_in_progress)
            {
                return Promise.reject("check_new already in progress");
            }
            
            lib.msg.checking_new_in_progress = true;
            if (lib.msg.debug) console.log("Checking for new messages...");
            return lib.msg.list().then(function(msg_ids){
                if (lib.msg.debug) console.log("Got " + msg_ids.length + " ids");
                var msg_ids_to_read = [];
                var promises = [];
                for (var i=0; i<msg_ids.length; i++)
                {
                    var msg_id = msg_ids[i];
                    promises.push(lib.storage.has_item("uid:" + lib.client.uid + ":msg_id:" + msg_id))
                }
                return Promise.all(promises).then(function(has_items){
                    var has_items_ids = has_items.filter(item => item !== false).map(function(item){ return item.replace(/^uid:.*:msg_id:/, "") });
                    var msg_ids_not_read = msg_ids.filter(item => !has_items_ids.includes(item));
                    if (lib.msg.debug) console.log("msg_ids to read:" + JSON.stringify(msg_ids_not_read));
                   
                    if (msg_ids_not_read.length > 0)
                    {
                        var first_10_msg_ids = msg_ids_not_read.slice(0, 10);
                        if (lib.msg.debug) console.log("Loading first " + first_10_msg_ids.length + " messages...");
                        
                        return lib.ajax.call("POST", "/receive", {"msg_ids": first_10_msg_ids}).then(function(results){
                            if (lib.msg.debug) console.log("Messages loaded:");
                            if (lib.msg.debug) console.log(results); 
                    
                            var add_msg_promises = [];
                            results.forEach(function(msg){
                                add_msg_promises.push(lib.msg.add_msg(msg));
                            });
                            
                            Promise.all(add_msg_promises).then(function(res){
                                
                                if (lib.msg.debug) console.log("add_msg_promises then:", res);
                                
                                return lib.msg.add_stored_ids(res).then(function(){
                                    
                                    if (lib.msg.debug) console.log("stored_ids added");
                                    
                                    lib.msg.checking_new_in_progress = false;
                                    
                                    return lib.msg.mark_read(res);
                                }, helpers.reject_handler);
                            }, helpers.reject_handler);
                        }, helpers.reject_handler);
                    }
                    else
                    {
                        lib.msg.checking_new_in_progress = false;
                    }
                }, helpers.reject_handler);
            }, function(err) { lib.msg.checking_new_in_progress = false; helpers.reject_handler(err);});
        },
        mark_read: function(msg_ids) {
            return lib.ajax.call("POST", "/read", {"msg_ids": msg_ids});
        },
        check_new_and_draw: function(){
            return lib.msg.check_new().then(
                function(res){ return lib.ui.draw.messages(); }, function(err){
                    if (err !== "check_new already in progress")
                    {
                        helpers.reject_handler(err);
                    }
                }
            );
        },
        add_msg: function(msg){
            var msg_id = msg['id'];
            var from = msg['from'];
            var to = msg['to'];
            var payload = msg['payload'];
            
            var incoming = !(from === lib.client.uid);
            
            return lib.receivers.get_receiver(
                from, true
            ).then(function(receiver){
                
                return lib.msg.parse_payload(msg).then(function(parsed_msg){
                    if (lib.msg.debug) console.log("msg_id:" + msg_id + " parsed: ", parsed_msg);
                    parsed_msg['incoming'] = incoming;
                    return lib.storage.set("msg:" + msg_id, parsed_msg).then(function(){
                        if (lib.msg.debug) console.log("msg:" + msg_id + " saved to storage");
                        
                        var p = Promise.resolve();
                        
                        if (lib.ui.msg.types.hasOwnProperty(parsed_msg.type))
                        {
                            if (lib.ui.msg.types[parsed_msg.type]['post_save'])
                            {
                                if (lib.msg.debug) console.log("msg:" + msg_id + ", calling post_save");
                                p = lib.ui.msg.types[parsed_msg.type].post_save(parsed_msg);
                            }
                        }
                       
                        return p.then(function() { 
                            return lib.storage.set(
                                "uid:" + lib.client.uid + ":msg_id:" + msg_id, 
                                msg_id
                            ).then(function(){
                                if (lib.msg.debug) console.log(
                                    "uid:" + lib.client.uid + ":msg_id:" + msg_id + " saved to storage"
                                );

                                return msg_id;
                            }, helpers.reject_handler);
                        }, helpers.reject_handler);
                    }, helpers.reject_handler);
                }, helpers.reject_handler);
            }, helpers.reject_handler);
        },
        parse_payload: function(msg){
            return new Promise(function(accept, reject){
                var raw_payload = msg['payload'];
                var res = {};
                
                var type = "unknown";
                var state = "unknown";
                var payload_object = null;
                var need_processing = false;
                
                msg['type'] = type;
                msg['state'] = state;
                msg['need_processing'] = false;
                
                if (raw_payload) {
                    if (lib.tools.isString(raw_payload))
                    {
                        msg['state'] = "encrypted";
                        try
                        {
                            var payload_object = lib.crypto.hybrid_decrypt_data(raw_payload);                        
                        }
                        catch (e)
                        {
                            console.log("Error in hybrid_decrypt_data: " + e);
                            console.log("raw_payload was:", raw_payload);
                            msg['state'] = 'broken';
                            delete msg['payload'];
                            
                        }
                    }
                    else if (lib.tools.isObject(raw_payload))
                    {
                        msg['state'] = 'unencrypted';
                        var payload_object = raw_payload;
                    }
                    else
                    {
                        console.log("unknown payload type of msg_id:" + msg['id'] + " payload:" + JSON.stringify(raw_payload));
                    }
                }
                else
                {
                    msg['state'] = 'broken';                    
                }
                
                if (payload_object)
                {
                    var type = payload_object['type'];
                    
                    if (lib.ui.msg.types.hasOwnProperty(type))
                    {
                        msg['type'] = type;
                        var parse_promise = lib.ui.msg.types[type].parse_payload(msg, payload_object);                        
                    }
                    else
                    {
                        msg['type'] = "unknown";
                        msg['state'] = "broken";
                        console.log("unknown payload type:", type)
                        var parse_promise = Promise.resolve(msg);                        
                    }
                }
                else
                {
                    var parse_promise = Promise.resolve(msg);
                }
                
                parse_promise.then(function(msg){

                    if (msg['type'] !== 'unknown')
                    {
                        delete msg['payload'];
                    }

                    accept(msg);
                    
                }, helpers.reject_handler);
            });
        },
        send: function(msg, receiver){
            var type = msg['type'];
            var payload = msg['payload'];
        }
    },
    crypto: {
        debug: false,
        rsa_encrypt_data: function(data, public_key){
            var e = new JSEncrypt();
            e.setPublicKey(public_key);
            var json_data = lib.tools.toJson(data);
            var encrypted = e.encrypt(json_data);
            return encrypted;
        },
        rsa_decrypt_data: function(data, private_key){
            private_key = private_key || lib.crypto.get_keys().private;
            var e = new JSEncrypt();
            e.setPrivateKey(private_key);
            
            try
            {
                var decrypted = lib.tools.fromJson(e.decrypt(data));
            }
            catch (e)
            {
                var decrypted = null;
            }
            
            return decrypted;
        },
        hybrid_encrypt_data: function(data, public_key){
            if (data === null)
            {
                // Please close DevTools :) You are not supposed to see this
                debugger;
            }
            var aes_key = lib.crypto.get_radnom_aes_key();
            var aes_iv = lib.crypto.get_random_aes_initial_vector();
            var key_and_ivector = {
                "key": forge.util.encode64(aes_key),
                "iv": forge.util.encode64(aes_iv)
            };
            var rsa_encrypted = lib.crypto.rsa_encrypt_data(key_and_ivector, public_key);
            
            var json_data = lib.tools.toJson(data);
            var json_data_b64 = forge.util.encode64(json_data)
            var aes_encrypted = lib.crypto.aes_encrypt_data(aes_key, aes_iv, json_data_b64);
            
            var res = "rsa::" + rsa_encrypted + "::aes::" + aes_encrypted + "::end";
            return res;
        },
        hybrid_decrypt_data: function(data, private_key){
            private_key = private_key || lib.crypto.get_keys().private;
            
            var rsa_i = data.indexOf("rsa::");
            var aes_i = data.indexOf("::aes::");
            var end_i = data.indexOf("::end");
            
            if (rsa_i === -1 || aes_i === -1 || end_i === -1)
            {
                throw new Error("Malformed data string:" + data);
            }
            
            var rsa_encrypted = data.substring(rsa_i+5, aes_i);
            var aes_encrypted = data.substring(aes_i+7, end_i);
            
            var key_and_ivector = lib.crypto.rsa_decrypt_data(rsa_encrypted, private_key);
            
            var key = forge.util.decode64(key_and_ivector['key']);
            var iv = forge.util.decode64(key_and_ivector['iv']);
            
            var json_data_b64 = lib.crypto.aes_decrypt_data(key, iv, aes_encrypted);
            var json_data = forge.util.decode64(json_data_b64);
            
            var decoded_data = lib.tools.fromJson(json_data);
            
            return decoded_data;
            
        },
        keys: {},
        get_public_key_for_use: function(shared_public_key){
            var key = lib.crypto.get_public_key_for_share(shared_public_key);
            key = "-----BEGIN PUBLIC KEY-----\n" + key + "\n-----END PUBLIC KEY-----";
            return key;
        },
        get_public_key_for_share: function(override_public_key){
            if (override_public_key === undefined)
            {
                var public_key = lib.crypto.keys.public;
            }
            else
            {
                var public_key = override_public_key;
            }
            if (!public_key) return "";
            return public_key.replace(
                "-----BEGIN PUBLIC KEY-----", ""
            ).replace(
                "-----END PUBLIC KEY-----", ""
            ).replace(
                "\n", ""
            ).replace(
                /(\r\n|\ \n|\r)/gm, ""
            ).replace(
                /\s/g,''
            );
        },
        validate_public_key: function(public_key) {
            var key = lib.crypto.get_public_key_for_use(public_key);
            c = new JSEncrypt();
            c.setPublicKey(key);
            if (c.key.n === null)
            {
                return false;
            }
            else
            {
                return true;
            }
        },
        sha256: function(str){
            return forge_sha256(str);
        },
        get_random_bytes: function(number){
            return forge.random.getBytesSync(number);
        },
        get_radnom_aes_key: function(){
            return lib.crypto.get_random_bytes(32);
        },
        get_random_aes_initial_vector: function(){
            return lib.crypto.get_random_bytes(16);
        },
        aes_encrypt_data(key, iv, data)
        {
            var cipher = forge.cipher.createCipher('AES-CBC', key);
            cipher.start({iv: iv});
            cipher.update(forge.util.createBuffer(data));
            cipher.finish();
            var encrypted = cipher.output;
            return forge.util.encode64(encrypted.data);
        },
        aes_decrypt_data(key, iv, encrypted_b64){
            var encrypted = forge.util.createBuffer(forge.util.decode64(encrypted_b64));
            var decipher = forge.cipher.createDecipher('AES-CBC', key);
            decipher.start({iv: iv});
            decipher.update(encrypted);
            var result = decipher.finish(); 
            return decipher.output.data;
        },
        set_private_key: function(private_key) {
            
            if (lib.crypto.debug) {
                console.log("Setting private key to ", private_key);
            }
            var keys = lib.crypto.get_keys();
            keys['private'] = private_key;            
            lib.crypto.keys = keys;
            
        },
        get_keys: function(){
            if (lib.crypto.keys && lib.crypto.keys['private'] && lib.crypto.keys['public'])
            {
                return lib.crypto.keys;
            }
            var private_key = lib.storage.get_local("private_key");
            var public_key = lib.storage.get_local("public_key");
            var keys_expire = lib.storage.get_local("keys_expire");
            if (lib.date.timestamp() > keys_expire)
            {
                private_key = null;
                public_key = null;
            }
            lib.crypto.keys = {"private": private_key, "public": public_key, "expire": keys_expire};
            lib.crypto.hide_private_key()
            return lib.crypto.keys;                   
        },
        hide_private_key: function() {
            if (lib.crypto.keys['private'])
            {
                lib.storage.del_local("private_key");
            }
        },
        unhide_private_key: function() {
            if (lib.crypto.keys['private'] && !lib.storage.get_local("private_key"))
            {
                lib.storage.set_local("private_key", lib.crypto.keys['private']);
            }
        },
        set_keys: function(key){
            var expire = key['expire'] || (lib.date.timestamp() + lib.conf.expire_delta_sec());
            lib.crypto.keys = {"private": key['private'], "public": key['public'], "expire": expire};
            
            lib.storage.set_local("private_key", key['private']),
            lib.storage.set_local("public_key", key['public']),
            lib.storage.set_local("keys_expire", expire)

        },
        del_keys: function(){
            lib.storage.del_local("private_key"),
            lib.storage.del_local("public_key"),
            lib.storage.del_local("keys_expire")
        },
        generate_keys: function(){
            return new Promise(function(resolve, reject) {
                keySize = lib.conf.key_size();
                var crypt = new JSEncrypt({default_key_size: keySize});
                crypt.getKey(function () {
                    result = {
                        private: crypt.getPrivateKey(),
                        public: crypt.getPublicKey()
                    };
                    lib.crypto.set_keys(result);
                    if (!lib.ui.is_mobile())
                    {
                        lib.crypto.hide_private_key();
                    }
                    resolve(result);
                });
            });
        },
        get_or_generate_keys: function(events) {
            for (var n in [
                    "before_lock_get", "after_lock_get_ok",
                    "before_get_keys", "after_get_keys_ok", "after_get_keys_err", 
                    "before_acquire", "after_acquire_ok", "after_acquire_err",
                    "before_generate", "after_generate_ok"
                ])
                {
                events[n] = events[n] || function(){};
            }
            
            return new Promise(function(resolve, reject){
                events['before_get_keys']();
                var keys = lib.crypto.get_keys();
                if (keys && keys.public && !keys.private)
                {
                    events['after_get_keys_err']();
                    events['before_acquire']();
                    var request_promise = lib.broadcast.request_private_key(1500, 5);
                }
                else if (!keys || !keys.private || !keys.public)
                {
                    events['after_get_keys_err']();
                    var request_promise = Promise.reject(new Error("no keys"));
                }
                else
                {
                    var request_promise = false;
                }
                
                if (request_promise !== false)
                {
                    request_promise.then(function(data){
                        // "then" would be called, executing only if private key accepted from another tab
                        events['after_acquire_ok']();
                        lib.crypto.set_private_key(data['private_key']);
                        resolve(lib.crypto.get_keys());

                    }).catch(function(err){
                        events['after_acquire_err']();
                        // "catch" - called when we didnt get key from another tab, or we doesnt have any keys at all.                        
                        console.log("request_promise err:", err);
                        events['before_generate']();
                        return lib.crypto.generate_keys().then(function(keys){
                            
                            events['after_generate_ok']();
                            lib.broadcast.post("keys_regenerated", {});
                            resolve(keys);
                        });
                    })
                }
                else
                {
                    events['after_get_keys_ok']();
                    resolve(keys);
                }
            });
        }
    },
    /**
    * Modal fuctional object
    * @type
    */
    modal: {
           /**
            * Simple templator, returning full-width content
            * @param {String} text - text, that should be used as a content
            * @returns {String} returning result html code
            */
           row: function(text)
           {
                   return "<div class='mf-row'><div class='mf-single'>" + text + "</div></div>";
           },
           /**
            * Simple templator, creating in-modal line with to columns, containing title and some input box
            * @param {String} title - title text
            * @param {String} input - input element
            * @returns {String} result html-code
            */
           formRow: function(title,input)
           {
                   return "<div class='mf-row'><div class='mf-title'>" + title + "</div><div class='mf-input'>" + input + "</div></div>";
           },
           /**
            * Create html-code for modal window content (but not show it)
            * @param {string} contentHtml html-code, that would be ibserted as a modal content block
            * @param {function(modalObj)} okCallback function that would be called on Ok click.
            *                                         object of modal window would be passed as first argument
            * @param {function(modalObj)} cancelCallback function that would be called on Close, Cancel button click.
            *					      if that function would return === false, closing process would be cancelled
            * @returns {jQuery} returning modal object
            */
           createHtml: function(title, contentHtml , buttonsHtml)
           {
                   var buttonsDefaultHtml = "";
                           buttonsDefaultHtml+= "<button class='btn btn-primary ok-button'>&nbsp;Ok&nbsp;</button>";
                           buttonsDefaultHtml+= "<button class='btn btn-inverse cancel-button'>&nbsp;Cancel&nbsp;</button>";
                           buttonsDefaultHtml+= "";

                   buttonsHtml = buttonsHtml ? buttonsHtml : buttonsDefaultHtml;

                   //Lets create unused Id.
                   var modalId=0;
                   while ($('#amodal_' + modalId).length>0)
                   {
                           modalId++;
                   }

                   if ($('#modal-paddock').length==0)
                   {
                           $('body').prepend('<div id="modal-paddock" style="display:none;"></div>');
                   }

                   var	content = ' <div class="box-modal " id="amodal_' + modalId + '" data-modal-number="' + modalId + '"><span class="box-modal_close arcticmodal-close">x</span>';
                           content+= '  <div class="box-title">' + title + "</div>";
                           content+= '   <div class="box-content unharismed">' + contentHtml + "</div>";
                           content+= '   <div class="box-bottom">' + buttonsHtml + "<div style='clear:both;'></div></div>";
                           content+= '  </div>';

                   $('#modal-paddock').prepend(content);
                   return $('#amodal_' + modalId);
           },
           
           /**
            * Open modal with custom content
            * @param {string} title The title of modal
            * @param {string} contentHtml html-code, which would be a content of modal
            * @param {function(event)} okCallback function that would be called then user clicked on ".ok-button"
            *								First argument to function would be a modal object
            * @param {function(event)} cancelCallback function that would be called then user clicked on ".cancel-button" or on "close modal cross-button"
            *								First argument to function would be a modal object
            *								If function returns ===false - closing operation would be cancelled
            * @param {function(event)} closeCallback function that would be called on any type of modal close process, If returns ===false - modal close would not happen
            * @param {function(modalObj)} constructCallback function that would be called, when modal constructuin is finished
            * @param {string} buttonsHtml  Html-code of buttons block. By default there are "ok" and "cancel" buttons
            * @param {object} addOptions object of additional options passed directly to arcticModal
            * @returns {jQuery} returns modal object
            */
           open: function(title, contentHtml, okCallBack, cancelCallback, closeCallback, constructCallback, buttonsHtml, addOptions)
           {
                   okCallBack = okCallBack ? okCallBack : function() {};
                   cancelCallback = cancelCallback ? cancelCallback : function() { return true; };
                   closeCallback = closeCallback ? closeCallback : function() { return true; };

                   var modal = lib.modal.createHtml(title, contentHtml, buttonsHtml);
                    return lib.modal.openRaw(okCallBack, cancelCallback, closeCallback, constructCallback, modal, addOptions);
           },

           /**
            * Open a modal window in its "raw" form, when all html-code is set entirely by hand.
            * (the usual open function creates its own modal window with default content)
            * @param {Function} okCallBack callback function called when "ok" button is pressed
            * @param {Function} cancelCallback callback function called when modal is tried to close (by pressing ESC, cross button or shadow background) 
            *                                  if callback returns value === false, close of modal would be cancelled
            * @param {Function} closeCallback  callback function called when modal being closed
            * @param {Function} constructCallback callback function called when modal is completely constructed
            * @param {String} html Html-code to create modal from
            * @param {Object} addOptions additional options to pass to arcticModal
            * @returns {Object} object, returned by arcticModal (the modal object)
            */
           openRaw:function(okCallBack, cancelCallback, closeCallback, constructCallback, html, addOptions){

                   okCallBack = okCallBack ? okCallBack : function() {};
                   cancelCallback = cancelCallback ? cancelCallback : function() { return true; };
                   closeCallback = closeCallback ? closeCallback : function() { return true; };

                   var modal = html;
                   var modalId = $(modal).attr('id');

                   if (constructCallback) constructCallback(modal);

                   $(modal).find('.ok-button').on('click',okCallBack);
                   $(modal).find('.cancel-button').on('click',function(event){
                           if (!(cancelCallback(event)===false)) $(modal).arcticmodal('close');
                   });

                   addOptions = addOptions || {};
                   addOptions['beforeClose'] = function(data){
                                   return closeCallback(data);
                           };
                   var userAfterCloseFunc = addOptions.afterClose || function(){};
                   var afterCloseFunc = function(event){
                           if (typeof userAfterCloseFunc === 'function') userAfterCloseFunc(event);
                           $('#' + modalId).remove();
                   };
                   addOptions.afterClose = afterCloseFunc;

                   return $(modal).arcticmodal(addOptions);
            },

           /**
            * Close specified modal
            * @param {string}|{DOMElement}|{jQuery} obj modal object or some element inside of it
            */
           close: function(obj, afterCloseCallback)
           {
                   if (typeof afterCloseCallback === 'function') $(obj).arcticmodal().afterClose = afterCloseCallback;
                   $(obj).arcticmodal('close');
           },
           /**
            * Close all modal windows
            */
           closeAll: function(){
                   $('.arcticmodal-container').each(
                           function(ind, elt){
                                   lib.modal.close(elt);
                           }
                   );
           },
           /**
            * Found modal window object by any of element inside the modal
            * @param {string}|{jQuery}|{HTMLDomElement} obj object inside the modal
            * @returns {undefined}
            */
           find: function(obj)
           {
                   obj = $(obj);
                   if (obj[0].tagName==='DIV' && obj.hasClass('box-modal') && /^amodal_[0-9]+$/.test(obj.attr('id')))
                   {
                           return obj;
                   }
                   else
                   {
                           var parent = $(obj).closest('div.box-modal');
                           if (parent.length===0) return null;
                           for(i in parent)
                           {
                                   if (i==parseInt(i))
                                   {
                                           if (/^amodal_[0-9]+$/.test($(parent[i]).attr('id')))
                                           {
                                                   return $(parent[i]);
                                           }
                                   }
                           }
                   }
           },

           /**
            * Standart alert analog
            * @param {string} title Title
            * @param {string} contentHtml Content (message)
            * @param {function} closeCallback function that would be called on modal close
            */
           alert: function(title, contentHtml, closeCallback)
           {
                   if (title && (typeof contentHtml==='undefined')) {contentHtml = title; title='';}
                   return lib.modal.open(title,contentHtml,null,null,closeCallback,null,"<button class='btn btn-primary cancel-button'>Ok</button><div style='clear:both;'></div>");
           },
           /**
            * Block all buttons and other form element on modal, remembeing old values
            */
           lock: function(modalObj)
           {
                   var elements = $(modalObj).find('button,input,textarea,select');
                   for (i in elements)
                   {
                           if (parseInt(i)==i)
                           {
                                   $(elements[i]).data('unlock', $(elements[i]).prop('disabled'));
                                   $(elements[i]).prop('disabled',true);
                           }
                   }
           },
           /**
            * Unblock all buttons and other form elements on modal, restoring states that was when lock method was calle
            */
           unlock: function(modalObj)
           {
                   var elements = $(modalObj).find('button,input,textarea,select');
                   for (var i in elements)
                   {
                           if (parseInt(i)==i)
                           {
                                   $(elements[i]).prop('disabled',$(elements[i]).data('unlock') ? true : false);
                           }
                   }
           },
           /**
            * Standart confirm analog
            * @param {string} title
            * @param {string} contentHtml
            * @param {function} okCallback
            * @param {function} cancelCallback
            */
           confirm: function(title, contentHtml, okCallback, cancelCallback, okButtonName, cancelButtonName, closeOnOk)
           {
                   if (typeof closeOnOk ==='undefined')  closeOnOk = true;
                   okButtonName = okButtonName || 'Ok';
                   cancelButtonName = cancelButtonName || 'Cancel';
                   cancelCallback = cancelCallback || function(){};
                   var buttons = "<button class='btn btn-primary ok-button'>&nbsp;" + okButtonName + "&nbsp;</button><button class='btn btn-inverse cancel-button'>&nbsp;" + cancelButtonName + "&nbsp;</button><div style='clear:both;'></div>";
                   return lib.modal.open(title,contentHtml,function(event){okCallback(event);if(closeOnOk)lib.modal.close(event.target);},function(event){cancelCallback(event); lib.modal.close(event.target);},null,null,buttons);
           },
           

    }
};

$(function(){
    lib.log.info("core.init");
    lib.core.init();
    
});
