<?php

require_once(__DIR__ . "/../microfw/main.php");

use Ramsey\Uuid\Uuid;

function create_access_token($uid, $sessid)
{
    return JWTH::encode([
        "typ" =>"access",
        "sub" => $uid,
        "exp" => time() + (int)get_conf("JWT_EXPIRE_SECONDS", 3600),
        "iss" => get_conf("SERVER_HOST", new Exception("SERVER_HOST is not configured")),
        "sid" => $sessid
    ]);
}

function create_refresh_token($uid, $sessid)
{
    return JWTH::encode([
        "typ"=>"refresh",
        "sub"=> $uid,
        "exp"=> time() + (int)get_conf("JWT_REFRESH_EXPIRE_SECONDS", 86400),
        "iss" => get_conf("SERVER_HOST", new Exception("SERVER_HOST is not configured")),                
        "sid" => $sessid
    ]);
}

function add_message($sender, $receiver, $payload)
{   
    $message_id = UUID::uuid4()->toString();
    Storage::set("msg:$message_id", [
        "id"=>$message_id, 
        "from"=>$sender,
        "to"=>$receiver,
        "payload"=>$payload
    ], get_conf("MSG_EXPIRE_SECONDS", 3600));
    
    Storage::lPush("messages_to_uid:$receiver", $message_id);
    Storage::lPush("messages_from_uid:$sender", $message_id);
    
    return $message_id;
}

function get_messages_list($uid)
{
    $messages_count = Storage::lLen("messages_to_uid:$uid");
    $message_ids = Storage::lGetRange("messages_to_uid:$uid", 0, $messages_count);
    return $message_ids;
}

function clear_message($uid, $msg_id)
{
    $message = Storage::get("msg:$msg_id");
    if ($message)
    {
        if (
                (isset($message['from']) && $message['from'] == $uid)
                ||
                (isset($message['to']) && $message['to'] == $uid)
            ) 
        {
            Storage::del("msg:$msg_id");
            Storage::lRem("messages_to_uid:$uid", $msg_id);
            Storage::lRem("messages_from_uid:$uid", $msg_id);
        }
    }
}

function clear_uid($uid)
{
    $messages_count = Storage::lLen("messages_to_uid:$uid");
    $message_ids = Storage::lGetRange("messages_to_uid:$uid", 0, $messages_count);
    foreach ($message_ids as $message_id)
    {
        Storage::del("msg:$message_id");
    }
    Storage::del("messages_to_uid:$uid");
    Storage::del("messages_from_uid:$uid");
    
    $sessid = Storage::get("sess_by_uid:$uid");
    
    Storage::del("sess_by_uid:$uid");
    Storage::del("uid_by_sess:$sessid");
}