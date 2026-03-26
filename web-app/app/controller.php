<?php

require_once(__DIR__ . "/../microfw/main.php");

require_once(__DIR__ . "/service.php");
require_once(__DIR__ . "/languages.php");

use Ramsey\Uuid\Uuid;

if (extension_loaded('newrelic')) { 
    newrelic_disable_autorum();
    newrelic_add_custom_parameter('remote_address', $_SERVER['REMOTE_ADDR']);

}

Storage::init();


function get_page_lang() {
    $supported = array_column(get_supported_languages(), "code");

    $normalize = function($lang) {
        return strtolower(str_replace('_', '-', trim((string)$lang)));
    };

    $candidates = [];
    if (isset($_COOKIE['lang'])) {
        $candidates[] = $_COOKIE['lang'];
    }
    if (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
        foreach (explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE']) as $part) {
            $candidates[] = trim(explode(';', $part)[0]);
        }
    }

    foreach ($candidates as $candidate) {
        $candidate = $normalize($candidate);
        if (in_array($candidate, $supported, true)) {
            return $candidate;
        }
        foreach ($supported as $lang) {
            if (explode('-', $lang)[0] === explode('-', $candidate)[0]) {
                return $lang;
            }
        }
    }

    return 'en-us';
}


Router::addMiddleware(function(){
    $headers = get_nginx_headers();
    if (isset($headers['Authorization']))
    {
        $authorization = $headers['Authorization'];
    }
});

$ssr_pages = ["about", "security", "clipboard", "share-key", "add-key"];
$lang = get_page_lang();

$meta_default = [
    "og_title" => "",
    "og_type" => "",
    "og_url" => "",
    "og_image" => "",
    "keywords" => "",
    "description" => "",
    "title" => ""
];

$meta_pages = array_map(function($meta_page) use ($meta_default) {
    return array_merge($meta_default, $meta_page);
}, [
    "about" => [
        "og_title" => "Cryptboard.io encrypted web chat and clipboard"
    ],
    "security" => [
        
    ],
    "clipboard" => [
        
    ],
    "share-key" => [
        
    ],
    "add-key" => [
        
    ]
]);

$page_context = function($lang, $meta=[]) use ($meta_default) {
    return [
        "lang" => $lang,
        "meta" => array_merge($meta_default, $meta),
    ];
};

Router::add(["pattern" => "#^/(?P<page>" . join("|", $ssr_pages) . ")(^|[^a-zA-Z0-9_-])?#", "type"=>"regexp"], function($route) use ($meta_pages, $lang, $page_context) {
   $page = $route['matches']['page'];
   echo render("_tabs_content", ["page"=>$page], "default", $page_context($lang, $meta_pages[$page])); 
});

Router::add(["pattern" => "#^(/|index\.php\??)$#", "type"=>"regexp"], function() use ($lang, $page_context){
   echo render("_tabs_content", ["page"=>"tabs"], "default", $page_context($lang));
});

Router::add(["pattern"=> "#^/clipboard/?$#", "type"=>"regexp"], function() use ($lang, $page_context){
   echo render("clipboard", ["page"=>"clipboard"], "default", $page_context($lang)); 
});

Router::add("/api/uid", function(){
    if (!isset($_SESSION['uid']))
    {
        $_SESSION['uid'] = Uuid::uuid4()->toString();
    }
    echo_json(["uid" => $_SESSION['uid']]);
}, ["POST"]);

Router::add("/api/jwt-pub-key", function(){
    echo_json(["jwt_public_key"=>get_conf("JWT_PUBLIC_KEY")]);
});

Router::add(["pattern"=>"#^/js/translations/languages\.js(\?.*)?#", "type"=>"regexp"], function(){
    header("Content-Type: application/javascript; charset=UTF-8");
    echo "window.TR = window.TR || {};\n";
    echo "window.TR_LANGUAGES = " . json_encode(
        get_supported_languages(),
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    ) . ";\n";
}, ["GET"]);

Router::add(["pattern"=>"#^/js/env\.js(\?.*)?#", "type"=>"regexp"], function(){
    header("Content-Type: application/javascript; charset=UTF-8");

    $app_conf = [
        "polling" => [
            "receive_list_interval_ms" => (int)get_conf("FRONTEND_POLL_RECEIVE_LIST_MS", 1000),
            "receive_interval_ms" => (int)get_conf("FRONTEND_POLL_RECEIVE_MS", 2000),
            "refresh_auth_interval_ms" => (int)get_conf("FRONTEND_POLL_REFRESH_AUTH_MS", 15000),
        ],
        "storage" => [
            "no_expire" => (bool)get_conf("FRONTEND_NO_EXPIRE", false),
            "ttl_seconds" => (int)get_conf("FRONTEND_TTL_SECONDS", 2678400),
        ],
        "debug" => [
            "js" => (bool)get_conf("JS_DEBUG", false),
            "ajax" => (bool)get_conf("FRONTEND_AJAX_DEBUG", false),
            "messages" => (bool)get_conf("FRONTEND_MESSAGES_DEBUG", false),
            "files" => (bool)get_conf("FRONTEND_FILES_DEBUG", false),
            "sound" => (bool)get_conf("FRONTEND_SOUND_DEBUG", false),
        ],
    ];

    echo "window.APP_CONF = " . json_encode(
        $app_conf,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    ) . ";\n";
}, ["GET"]);

Router::add("/api/icons", function() use ($lang, $page_context){
    echo render("icons", [], "default", $page_context($lang));
});

Router::add("/api/refresh", function(){
    $token = post('refresh_token') ?? null;
    
    $uid = JWTH::check($token, "refresh", $data);
    
    $sessid = $data['sid'];
    
    Storage::set("sess_by_uid:$uid", $sessid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));
    Storage::set("uid_by_sess:$sessid", $uid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));

    $res['access_token'] = create_access_token($uid, $sessid);
    $res['refresh_token'] = create_refresh_token($uid, $sessid);
    
    return $res;
   
}, ["post"]);

Router::add("/api/check", function(){
    $uid = JWTH::auth_bearer($data);
    
    return [
        "check"=>"ok",
        "uid"=>$uid
    ];
});

Router::add("/api/auth", function(){
    $uid = UUID::uuid4()->toString();
    $sessid = UUID::uuid4()->toString();
    
    Storage::set("sess_by_uid:$uid", $sessid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));
    Storage::set("uid_by_sess:$sessid", $uid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));
    
    return [
        "access_token" => create_access_token($uid, $sessid),
        "refresh_token" => create_refresh_token($uid, $sessid)
    ];
});

Router::add("/api/clear", function(){
    $uid = JWTH::auth_bearer($data);
    
    clear_uid($uid);
    
    return [
        "clear" => "ok"        
    ];
});

Router::add("/api/send", function(){
    $uid = JWTH::auth_bearer($data);
    Router::throttle($uid, "send", 50);
    
    $receiver = post("receiver");
    $payload = post("payload");
    
    if (!$receiver || !Storage::get("sess_by_uid:$receiver"))
    {
        throw new SendException("receiver not found");
    }
    
    if (!$payload)
    {
        throw new SendException("payload is empty");
    }
    
    add_message($uid, $receiver, $payload);
});

Router::add("/api/send-multi", function(){
    $uid = JWTH::auth_bearer($data);
    Router::throttle($uid, "send-multi", 50);
    
    $msgs = post("msgs");
    if (!$msgs) 
    {
        throw new SendException("no msgs field");
    }
    
    $res = [];
    
    foreach ($msgs as $msg)
    {
        $receiver = $msg["receiver"] ?? null;
        $payload = $msg["payload"] ?? null;
        
        if (!$receiver || !Storage::get("sess_by_uid:$receiver"))
        {
            $res[] = ["status"=>500, "info" => "receiver_not_found", "receiver_uid"=>$receiver];
            continue;
        }

        if (!$payload)
        {
            $res[] = ["status"=>500, "info" => "payload_empty"];
            continue;
        }

        $res[] = add_message($uid, $receiver, $payload);
    }
    
    return $res;
    
});

Router::add("/api/receive-list", function(){
   
    $uid = JWTH::auth_bearer($data);
    
    return get_messages_list($uid);
    
});

Router::add("/api/receive", function($route){
    $uid = JWTH::auth_bearer($data);
   
    $msg_ids = post("msg_ids");
    
    if (!$msg_ids)
    {
        throw new ApiException("no msg_ids supplied");
    }
    
    $keys = array_map(function($x){return "msg:$x";}, $msg_ids);
    
    $msgs = Storage::mGet($keys);

    foreach ($msgs as $msg)
    {
        if (!$msg)
        {
            continue;
        }

        $msg_from = $msg["from"] ?? null;
        $msg_to = $msg["to"] ?? null;

        if ($msg_from !== $uid && $msg_to !== $uid)
        {
            throw new AuthException("message access denied");
        }
    }
    
    return $msgs;
    
});

Router::add("/api/read", function($route){
   
    $uid = JWTH::auth_bearer($data);
    
    $msg_ids = post("msg_ids");
    
    if (!$msg_ids)
    {
        throw new ApiException("no msg_id supplied");
    }
    
    foreach($msg_ids as $msg_id)
    {
        clear_message($uid, $msg_id);
    }
    
    return ["clear"=>"ok"];
});
