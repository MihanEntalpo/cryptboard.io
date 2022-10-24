/* 
 * ServiceWorker js file
 */
var lib = {
    version: "0.0.1",
    broadcast: null,
    ping_to_pages: null,
    init: function(){
        self.addEventListener('install', (event) => {
            return lib.on_install(event);
        });
    },
    on_install: function(event){
        self.importScripts('shared.js');
        lib.broadcast = new BroadcastMessanger();
        lib.boradcast.init();
        lib.ping_to_pages = new IntervalCaller(function(){
            lib.broadcast.send("sw.ping", {"ping_num": randint(1, Math.pow(10, 6))})
        }, 1000, "ping_to_pages", true);
    },
    send_to_all_clients: function(type, data)
    {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => lib.send_to_client(client, type, data));
        });
    },
    send_to_client: function(client, type, data)
    {
        client.postMessage({type: type, data: data});
    }
}

lib.init();
