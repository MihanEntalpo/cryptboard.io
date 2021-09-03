<?php

require_once "main.php";

use \Firebase\JWT\JWT;


class JWTH
{
    public static function encode($data)
    {
        static $privateKey;
        if (is_null($privateKey))
        {
            $privateKey = str_replace("\\n", "\n", get_conf("JWT_PRIVATE_KEY"));
            if (!$privateKey)
            {
                throw new Exception("JWT_PRIVATE_KEY not set in Environment");
            }
        }
        return JWT::encode($data, $privateKey, 'RS256');
    }
    
    public static function decode($jwt)
    {
        static $privateKey;
        if (is_null($privateKey))
        {
            $publicKey = str_replace("\\n", "\n", get_conf("JWT_PUBLIC_KEY"));
            if (!$publicKey)
            {
                throw new Exception("JWT_PUBLIC_KEY not set in Environment");
            }
        }
        return (array)JWT::decode($jwt, $publicKey, array('RS256'));
    }
    
    public static function auth_bearer(&$data)
    {
        $headers = get_nginx_headers();
        
        if (isset($headers['Authorization']))
        {
            $a = $headers['Authorization'];
            if (substr($a, 0, 7) == "Bearer ")
            {
                $token = substr($a, 7);

                $uid = JWTH::check($token, "access", $data);

		if (extension_loaded('newrelic')) {
                        newrelic_add_custom_parameter('uid', $uid);
                }
                
                return $uid;
            }
            else
            {
                throw new AuthException("Authorization token is not Bearer");
            }
        }
        else
        {
            throw new AuthException("Authorization header not set");
        }
    }
    
    public static function check($jwt, $type, &$data)
    {
        try
        {
            $data = JWTH::decode($jwt);

            if (($data['typ'] ?? "") != $type)
            {
                throw new JwtException("wrong type");
            }
            else if (($data['iss'] ?? "") != get_conf("SERVER_HOST", new Exception("SERVER_HOST is not configured")))
            {
                throw new JwtException("wrong issuer");
            }
            else if (!($data['sub'] ?? ""))
            {
                throw new JwtException("sub not found");
            }
            else if (!($data['sid'] ?? ""))
            {
                throw new JwtException("sid not found");
            }
            else if ($data['sid'] && $data['sub'])
            {
                $uid_in_jwt = $data['sub'];
                if (!$uid_in_jwt)
                {
                    throw new JwtException("uid in sub not found");
                }
                
                $uid_in_sess = Storage::get("uid_by_sess:" . $data['sid']);
                $sess_in_uid = Storage::get("sess_by_uid:" . $uid_in_jwt);

                if (!$sess_in_uid)
                {
                    throw new JwtException("uid not found");
                }
                
                if ($uid_in_jwt != $uid_in_sess)
                {
                    throw new JwtException("uid by sid and uid in sub not equal");
                }
                
                $uid = $uid_in_jwt;
            }
        }
        catch(RuntimeException $e)
        {
            throw new JwtException($e->getMessage());
        }
        
        return $uid;
    }
}
