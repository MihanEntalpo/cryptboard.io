<?php

require_once(__DIR__ . "/../microfw/main.php");

require_once(__DIR__ . "/service.php");

use Ramsey\Uuid\Uuid;

if (extension_loaded('newrelic')) { 
    newrelic_disable_autorum();
    newrelic_add_custom_parameter('remote_address', $_SERVER['REMOTE_ADDR']);

}


Storage::init();

Router::addMiddleware(function(){
    $headers = get_nginx_headers();
    if (isset($headers['Authorization']))
    {
        $authorization = $headers['Authorization'];
    }
});

Router::add(["pattern" => "#^(/|index\.php\??)$#", "type"=>"regexp"], function(){
   echo render("_tabs_content", ["page"=>"tabs"], "default");
});

Router::add("/uid", function(){
    if (!isset($_SESSION['uid']))
    {
        $_SESSION['uid'] = Uuid::uuid4()->toString();
    }
    echo_json(["uid" => $_SESSION['uid']]);
}, ["POST"]);

Router::add("/jwt-pub-key", function(){
    echo_json(["jwt_public_key"=>get_conf("JWT_PUBLIC_KEY")]);
});

Router::add(["pattern"=> "#^/clipboard/?$#", "type"=>"regexp"], function(){
   echo render("clipboard", ["page"=>"clipboard"], "default"); 
});

Router::add("/index.php?XDEBUG_SESSION_START=netbeans-xdebug", function(){
   echo "XDEBUG_PROFILE!"; 
});

Router::add("/test-redis", function(){
    echo "get x:" . Storage::get("x") . "<br>";
    echo "set x to " . time() ."<br>";
    Storage::set("x", time());
    echo "get x again: " . Storage::get("x") . "<br>";
});

Router::add("/icons", function(){
    echo render("icons", [], "default");
});

Router::add("/refresh", function(){
    $token = post('refresh_token') ?? null;
    
    $uid = JWTH::check($token, "refresh", $data);
    
    $sessid = $data['sid'];
    
    Storage::set("sess_by_uid:$uid", $sessid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));
    Storage::set("uid_by_sess:$sessid", $uid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));

    $res['access_token'] = create_access_token($uid, $sessid);
    $res['refresh_token'] = create_refresh_token($uid, $sessid);
    
    return $res;
   
}, ["post"]);

Router::add("/check", function(){
    $uid = JWTH::auth_bearer($data);
    
    return [
        "check"=>"ok",
        "uid"=>$uid
    ];
});

Router::add("/fake-clipboard", function(){
    echo render("fake-clipboard", [], "default");
});

Router::add("/auth", function(){
    $uid = UUID::uuid4()->toString();
    $sessid = UUID::uuid4()->toString();
    
    Storage::set("sess_by_uid:$uid", $sessid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));
    Storage::set("uid_by_sess:$sessid", $uid, (int)get_conf("UID_EXPIRE_SECONDS", 604800));
    
    return [
        "access_token" => create_access_token($uid, $sessid),
        "refresh_token" => create_refresh_token($uid, $sessid)
    ];
});

Router::add("/clear", function(){
    $uid = JWTH::auth_bearer($data);
    
    clear_uid($uid);
    
    return [
        "clear" => "ok"        
    ];
});

Router::add("/send", function(){
    $uid = JWTH::auth_bearer($data);
    Router::throttle($uid, "send", 200);
    
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

Router::add("/send-multi", function(){
    $uid = JWTH::auth_bearer($data);
    Router::throttle($uid, "send-multi", 200);
    
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

Router::add("/receive-list", function(){
   
    $uid = JWTH::auth_bearer($data);
    
    return get_messages_list($uid);
    
});

Router::add("/receive", function($route){
   
    $msg_ids = post("msg_ids");
    
    if (!$msg_ids)
    {
        throw new ApiException("no msg_ids supplied");
    }
    
    $keys = array_map(function($x){return "msg:$x";}, $msg_ids);
    
    $msgs = Storage::mGet($keys);
    
    return $msgs;
    
});

Router::add("/read", function($route){
   
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
