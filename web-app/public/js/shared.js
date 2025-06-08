var timestamp = function(){
    return Date.now() / 1000 | 0;
};

var randint = function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
    }
};


/**
 * Cross-tab broadcast messaging and event system.
 * Allows to send messages between tabs of a single browser.
 * Used to share keys between tabs, or send signal to clear session on all tasks, if user asks so.
 * 
 * Based on browsers's BroadcastChannel, of BroadcastChannel2 (based on a library https://github.com/pubkey/broadcast-channel)
 * Safari browser doesn't support BroadcastChannel, so BroadcastChannel2 come to the rescue
 */
class BroadcastMessanger {
    constructor(debug) {
        this.debug = debug || false;
        this.channel = null;
        this.listeners = {};
    }

    /**
     * Initialize channel
     */
    init() {
        var obj = this;
        var root = (typeof WorkerGlobalScope === "undefined") ? window : WorkerGlobalScope;
        var bc = root.BroadcastChannel || root.BroadcastChannel2
        this.channel = new bc('cryptboard-main');
        this.channel.onmessage = obj.receive_raw.bind(obj); 
    }

    /**
     * Close channel
     */
    close() {
        this.channel.close();
    }
    /**
     * Send raw data to channel
     * @param {Object} message
     */
    post_raw(message)
    {
        this.channel.postMessage(message);
    }
    /**
     * Send data with specific type (type is used to detect event handler that should be called)
     * @param {string} type The type of message
     * @param {Object} data Data (could be empty)
     */
    post(type, data)
    {
        if (this.debug) {
            console.log("broadcast.post(", type, data, ")");
        }

        this.post_raw({
            "type": type,
            "data": data
        });
    }
    /**
     * Raw of data
     * Works universally on BroadcastChannel or BroadcastChannel2
     * @param {Event|Object} d 
     */
    receive_raw(d)
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
        try
        {
            this.receive(res['type'], res['data']);
        }
        catch (e)
        {
            debugger;
            throw e;
        }
    }
    /**
     * Receiver of data with type and usefull payload. 
     * Detects what event listeners to call, and call them
     * @param {String} type
     * @param {Object} data
     */
    receive(type, data)
    {
        if (this.debug) {
            console.log("broadcast.receive(", type, data, ")");
        }
        var listeners = this.listeners[type];
        if (listeners)
        {
            for (var lid in listeners)
            {
                if (this.debug)
                    console.log("broadcast.listeners[", lid, "](", data, ")");
                listeners[lid](data);
            }
        }
    }

    /**
     * Add event listener
     * @param {String} type - the type on which event handler would be called
     * @param {function} func - handler itself
     * @param {boolean} once - if true, handler would be removed after it's called
     * @param {type} timeout - if set there are timeout after that handler would be removed
     * @param {type} func_on_timeout - function that should be called when timeout happened
     * @param {type} func_check_once_need_to_be_cleaned - function to check input data to detect, if once-handler should be removed
     */
    add_listener(type, func, once, timeout, func_on_timeout, func_check_once_need_to_be_cleaned) {
        once = once || false;
        timeout = timeout || -1;
        func_on_timeout = func_on_timeout || function () {};
        func_check_once_need_to_be_cleaned = func_check_once_need_to_be_cleaned || function (data) {
            return true;
        };

        this.listeners[type] = this.listeners[type] || {};

        do
        {
            var lid = "l" + randint(10000000,
                                   100000000);
        } while (this.listeners[type].hasOwnProperty(lid))

        var timeoutObjId = null;

        if (once)
        {
            if (timeout > 0)
            {
                timeoutObjId = setTimeout(func_on_timeout, timeout);
            }
        }

        this.listeners[type][lid] = function (data) {
            if (timeout > 0 && once)
            {
                clearTimeout(timeoutObjId);
            }

            if (once && func_check_once_need_to_be_cleaned(data)) {
                delete this.listeners[type][lid];
            }

            var res = func(data);

            return res;
        };
    }    
    /**
     * Request private key from other tab.
     * @param {integer} timeout - how many time to wait before giveup
     * @param {integer} retries - how many times to send "give_me_key" message
     * @returns {Promise}
     */
    request_private_key(timeout, retries) {
        retries = retries || 3;
        timeout = timeout || 2000;
        var single_timeout = parseInt(timeout / retries);
        var retries_made = 0;

        return new Promise(function (resolve, reject) {
            console.log("RPK: Promise is created")

            console.log("RPK: Creating timeout for single_retry");

            var timeout_id = null;

            var retry_give_me_key = function () {
                console.log("RPK: retry_give_me_key()");
                this.post("give_me_private_key", {});
                console.log("RPK: posted give_me_private_key");
                retries_made += 1;
                if (retries_made > retries)
                {
                    console.log(`RPK: as ${retries_made} > ${retries} clearing timeout`)
                    clearTimeout(timeout_id);
                    timeout_id = null;
                } else
                {
                    console.log(`RPK: as ${retries_made} <= ${retries} resetting retry_give_me_key to be called after ${single_timeout} msec`);
                    timeout_id = setTimeout(retry_give_me_key, single_timeout);
                }
            };

            retry_give_me_key();

            console.log("RPK: Adding 'take_private_key' listener");
            this.add_listener(
                    "take_private_key",
                    //Success, data arrived!
                            function (data) {
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
                                    function () {
                                        console.log("RPK: take_private_key handler timeout happened. Clearing timeout, rejecting promise");
                                        //Clear timeout
                                        clearTimeout(timeout_id);
                                        timeout_id = null;
                                        //reject promise
                                        reject(new Error("timeout"));
                                    },
                                    // Do we need to recet handler?
                                            function (data) {
                                                console.log("RPK: checking for real private_key arrived for 'once' handler rmoval");
                                                // If data really arrived - yes, we need
                                                return (data.hasOwnProperty("private_key") && !!data['private_key']);
                                            }
                                    );
                                });
                    }

        }


/**
* IntervalCaller class, calls function between intervals, not allowing to overlap two function calls
* @param {function} func Function to run
* @param {Integer} interval_ms Milliseconds between calls
* @param {String} name Name of IntervalCaller instance
* @param {Boolean} debug Is debug enabled?
* @returns {IntervalCaller} instance of object
*/
class IntervalCaller{

    constructor(func, interval_ms, name, debug) {
        if (!func) throw Error("func not set");
        if (!interval_ms) throw Error("interval_ms not set");
        if (!name) throw Error("name not set");
        var obj = this;
        
        this.debug = debug ? true : false;
        this.name = name;
        this.func = func;
        this.interval = null;
        this.interval_ms = interval_ms;
        this.in_progress = false;
        this.go = function(){
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
        this.start = function(){
            this.stop();
            this.interval = setInterval(this.go, this.interval_ms);
        };
        this.stop = function(){
            if (this.interval)
            {
                clearInterval(this.interval);
                this.interval = null;
            }
        };
    };
}


class Locker {
                
    /**
     * Initialize the mutex.
     *
     * @param name - Name of the mutex.
     * @param db - Existing database to use. If null, an IndexedDB database named
     *   'idb-mutex' is created. If an existing database is provided it must have
     *   an object store name matching `options.objectStoreName`.
     * @param options
     */
    constructor(name, db, options) {
      var DEFAULT_EXPIRY = 10 * 1000;

      // Generate a good-enough random identifier for this instance.
      this._id = Math.round(Math.random() * 10000).toString();

      this._objectStoreName = 'mutexes';
      if (options && options.objectStoreName) {
        this._objectStoreName = options.objectStoreName;
      }

      this._db = db || this._initDb(this._objectStoreName);
      this._name = name;
      this._expiry = (options && options.expiry) ? options.expiry : DEFAULT_EXPIRY;
      this._spinDelay = (options && options.spinDelay) ? options.spinDelay : 50;
    }

    /**
     * Factory function that creates or takes already created lock with specific name
     * @param {String} name
     * @param {String} db Existing database to use, by default 'idb-mutex'
     * @param {Object} options passed to constructor
     * @returns {Locker}
     */
    static get(name, db, options) {
        Locker.named_locks = Locker.named_locks || {};
        if (!Locker.named_locks.hasOwnProperty(name))
        {
            Locker.named_locks[name] = new Locker(name, db, options);
        }
        return Locker.named_locks[name];
    }

    /**
     * Acquire the lock.
     *
     * If no other instance currently holds the lock, the previous lock has expired
     * or the current instance already holds the lock, then this resolves
     * immediately.
     *
     * Otherwise `lock()` waits until the current lock owner releases the lock or
     * it expires.
     *
     * Returns a Promise that resolves when the lock has been acquired.
     */
    async lock() {
      // Spin until we get the lock.
      while (true) {
        if (await this._tryLock()) {
          break;
        }
        await delay(this._spinDelay);
      }
    }



    async with_lock(func) {
        return this.lock().then(() => {

            return new Promise((resolve, reject) => {
                Promise.resolve(func()).then(function(){
                    resolve();
                });
            }).then(this.unlock.bind(this))
        }).catch(err => {
            console.error(err);
            throw err;
        });
    }

    /**
     * Release the lock.
     *
     * Releases the lock, regardless of who currently owns it or whether it is
     * currently locked.
     */
    async unlock() {
      const db = await this._db;
      const tx = db.transaction(this._objectStoreName, 'readwrite');
      const store = tx.objectStore(this._objectStoreName);
      const unlockReq = store.put({ expiresAt: 0, owner: null }, this._name);

      return new Promise((resolve, reject) => {
        unlockReq.onsuccess = () => resolve();
        unlockReq.onerror = () => reject(unlockReq.error);
      });
    }

    _initDb(objectStoreName) {
      // nb. The DB version is explicitly specified as otherwise IE 11 fails to
      // run the `onupgradeneeded` handler.
      return new Promise((resolve, reject) => {
        const openReq = indexedDB.open('idb-mutex', 1);
        openReq.onupgradeneeded = () => {
          const db = openReq.result;
          db.createObjectStore(objectStoreName);
        };
        openReq.onsuccess = () => resolve(openReq.result);
        openReq.onerror = () => reject(openReq.error);
      });
    }

    async _tryLock() {
      const db = await this._db;
      const tx = db.transaction(this._objectStoreName, 'readwrite');
      const store = tx.objectStore(this._objectStoreName);

      // We use the `onsuccess` and `onerror` callbacks rather than writing a
      // generic request Promise-ifying function because of issues with
      // transactions being auto-closed when actions within a transaction span
      // Promise callbacks.
      //
      // See https://github.com/jakearchibald/idb/blob/2c601b060dc184b9241f00b91af94ae966704ee2/README.md#transaction-lifetime
      return new Promise((resolve, reject) => {
        const lockMetaReq = store.get(this._name);
        lockMetaReq.onsuccess = () => {
          const lockMeta = lockMetaReq.result;
          if (!lockMeta || lockMeta.owner === this._id || lockMeta.expiresAt < Date.now()) {
            const newLockMeta = {
              owner: this._id,
              expiresAt: Date.now() + this._expiry,
            };
            const writeReq = store.put(newLockMeta, this._name);
            writeReq.onsuccess = () => resolve(true);
            writeReq.onerror = () => reject(writeReq.error);
          } else {
            resolve(false);
          }
        };
        lockMetaReq.onerror = () => reject(lockMetaReq.error);
      });
    }
}


class InterTabLock {
    constructor(debug) {
        this.debug = debug || false;
        this.broadcast = null;
        this.acquired_locks = {};
        this.acquiring_process = {};
    }
    /**
     * Initialization
     * @returns {undefined}
     */
    init(broadcast){
        this.broadcast = broadcast;
        this.broadcast.add_listener("lock_already_taken", this.on_lock_already_taken_handler.bind(this));
        this.broadcast.add_listener("you_can_take_lock", this.on_you_can_take_lock_handler.bind(this));  
        this.broadcast.add_listener("can_i_take_lock", this.on_can_i_take_lock_handler.bind(this));
    }    
    /**
     * Acquire lock
     * @param {string} lock_name name of lock
     * @param {int} giveup_timeout How much time to wait for successfule actire (msec), default 2000
     * @param {int} release_timeout After what time lock should be automatically released, if it didn't happen manually (msec), default 20000
     * @param {int} await_timeout Interval to receive message "lock_already_taken" to not acquire lock (msec), default 500
     * @param {int} check_interval Interval to send broadcast message "can_i_take_lock" (msec), default 100
     * @param {Promise} promise that resolves then lock is taken
     */
    get(lock_name, giveup_timeout, release_timeout, await_timeout, check_interval){
        
        var obj = this;
        
        giveup_timeout = giveup_timeout || 2000;
        release_timeout = release_timeout || 20000;
        await_timeout = await_timeout || 500;
        check_interval = check_interval || 100;

        if (this.acquiring_process.hasOwnProperty(lock_name))
        {
            return this.acquiring_process[lock_name].promise;
        }

        if (this.acquired_locks.hasOwnProperty(lock_name))
        {
            return Promise.resolve(lock_name);
        }

        if (this.debug) console.log("this.get_lock(", lock_name , giveup_timeout, release_timeout, await_timeout, check_interval, ")");

        var do_check_lock = () => {
            var process = obj.acquiring_process[lock_name];
            if (obj.debug) console.log("this.get_lock(", lock_name , ") -> do_check_lock");
            obj.broadcast.post("can_i_take_lock", {
                "lock_name": lock_name,
                "start_time": process.start_time,
                "rock_scissors_paper": process.rock_scissors_paper
            });
        };

        var do_giveup_lock = () => {
            var process = this.acquiring_process[lock_name];
            if (obj.debug) console.log("this.get_lock(", lock_name , ") -> do_giveup_lock");

            clearTimeout(process.check_timeout_id);
            clearTimeout(process.await_timeout_id);
            clearTimeout(process.giveup_timeout_id);

            delete obj.acquiring_process[lock_name];

            process.reject(lock_name);

        };

        var do_await_lock = function(){
            if (obj.debug) console.log("this.get_lock(", lock_name , ") -> do_await_lock");
            var lock_take_success = false;
            var process = obj.acquiring_process[lock_name];

            if (!process)
            {
                return;
            }

            if (obj.acquiring_process[lock_name].lock_taken_arrived)
            {
                lock_take_success = false;
            }
            else
            {
                lock_take_success = true;
            }

            if (lock_take_success)
            {
                if (obj.debug) console.log("this.get_lock(", lock_name , ") -> do_await_lock -> lock_take_success:true");

                clearTimeout(process.check_timeout_id);
                clearTimeout(process.await_timeout_id);
                clearTimeout(process.giveup_timeout_id);

                delete obj.acquiring_process[lock_name];

                obj.acquired_locks[lock_name] = {
                    lock_name: lock_name,
                    free_lock_timeout_id: setTimeout(function(){
                        obj.free(lock_name);
                    }, release_timeout)
                };

                process.resolve(lock_name);
            }
            else
            {
                if (obj.debug) console.log("this.get_lock(", lock_name , ") -> do_await_lock -> lock_take_success:false");                    
            }
        };

        var promise = new Promise(function(resolve, reject){

            var data = {
                lock_name: lock_name,
                promise: promise,
                resolve: resolve,
                reject: reject,
                check_timeout_id: setTimeout(do_check_lock, check_interval),
                await_timeout_id: setTimeout(do_await_lock, await_timeout),
                giveup_timeout_id: setTimeout(do_giveup_lock, giveup_timeout),
                lock_taken_arrived: false,
                start_time: timestamp(),
                rock_scissors_paper: Math.random() * 1000000000
            };

            obj.acquiring_process[lock_name] = data;

        });

        do_check_lock();

        return promise;

    }
    /**
     * Free previously acquired lock
     * @param {string} lock_name
     */
    free(lock_name) {
        if (this.debug) console.log("this.free(", lock_name , ")");

        if (this.acquired_locks.hasOwnProperty(lock_name))
        {
            clearTimeout(this.acquired_locks[lock_name].free_lock_timeout_id);
            delete this.acquired_locks[lock_name];
        }
    }
    /**
     * Acquire lock, then run callback, then automatically frees lock
     * @param {string} lock_name name of lock
     * @param {function} callback function to run after lock is taken
     * @param {int} giveup_timeout How much time to wait for successfule actire (msec), default 2000
     * @param {int} release_timeout After what time lock should be automatically released, if it didn't happen manually (msec), default 20000
     * @param {int} await_timeout Interval to receive message "lock_already_taken" to not acquire lock (msec), default 500
     * @param {int} check_interval Interval to send broadcast message "can_i_take_lock" (msec), default 100
     */
    with(lock_name, callback, giveup_timeout, release_timeout, await_timeout, check_interval) {
        this.get(lock_name, giveup_timeout, release_timeout, await_timeout, check_interval).then(function(){
            callback();
            this.free(lock_name);
        }, helpers.reject_handler)
    }
    /**
     * Analog of "with" function, but, takes function, that returns promise, and return it's promise, then, automatically frees lock
     */
    with_promise(lock_name, callback_returning_promise, giveup_timeout, release_timeout, await_timeout, check_interval) {
        if (this.debug) console.log("this.with_promise(", lock_name, ")");
        return this.get(lock_name, giveup_timeout, release_timeout, await_timeout, check_interval).then(function(){
            if (this.debug) console.log("callback_returning_promise (lock: ", lock_name, ") started");
            return callback_returning_promise().then(function(result){
                if (this.debug) console.log("callback_returning_promise (lock: ", lock_name, ") finished, freeing lock");
                this.free(lock_name);
                return Promise.resolve(result);
            }).catch(function(err){
                if (this.debug) console.log("callback_returning_promise (lock: ", lock_name, ") errored, freeing lock");
                this.free(lock_name);
                return Promise.reject(err);
            });
        }, helpers.reject_handler);
    }
    /**
     * Event handler what is called then other tab asks "can i take lock?"
     * @param {Object} data - data arrived from broadcast
     */
    on_can_i_take_lock_handler(data){
        if (this.debug) console.log("this.on_can_i_take_lock_handler(", data , ")");

        var lock_name = data['lock_name'];
        var start_time = data['start_time'];
        var rock_scissors_paper = data['rock_scissors_paper'];

        if (this.acquired_locks.hasOwnProperty(lock_name))
        {
            if (this.debug) console.log("this.on_can_i_take_lock_handler(", lock_name , ") -> acquire_locks exists");
            this.broadcast.post("lock_already_taken", {"lock_name": lock_name});
        }
        else if (this.acquiring_process.hasOwnProperty(lock_name))
        {
            var process = this.acquiring_process[lock_name];

            if (this.debug) console.log("this.on_can_i_take_lock_handler(", lock_name , ") -> acquiring_process exists");
            if (this.debug) console.log("our process start_time:", process.start_time, ", their process start_time:", start_time);
            if (this.debug) console.log("our process rock_scissors_paper:", process.rock_scissors_paper, ", their process rock_scissors_paper:", rock_scissors_paper);


            if (process.start_time < start_time || (
                    process.start_time === start_time && process.rock_scissors_paper < rock_scissors_paper
            ))
            {
                if (this.debug) console.log("this.get_lock(", lock_name , ") -> acquiring_process exists, and is yonger than arrived");
                this.broadcast.post("lock_already_taken", {
                    "lock_name": lock_name, 
                    "start_time": start_time, 
                    "rock_scissors_paper": process.rock_scissors_paper
                });
            }
        }
        else
        {
            this.broadcast.post("you_can_take_lock", {
                "lock_name": lock_name, 
                "start_time": start_time, 
                "rock_scissors_paper": 1000000000
            });
        }
    }
    /**
     * Event handler that is called then other tab say "I've already taken the lock!"
     * @param {Object} data
     * @returns {undefined}
     */
    on_lock_already_taken_handler(data){            
        if (this.debug) console.log("this.on_lock_already_taken_handler(", data , ")");

        var lock_name = data['lock_name'];
        if (this.acquiring_process.hasOwnProperty(lock_name))
        {
            if (this.debug) console.log("this.on_lock_already_taken_handler(", data , ") -> lock_taken_arrived = true");
            this.acquiring_process[lock_name].lock_taken_arrived = true;
        }
    }
    /**
     * Event handler that is called than other tab say "Yes, you can take the lock"
     * @param {type} data
     * @returns {undefined}
     */
    on_you_can_take_lock_handler(data){

    }
}


