<?php

class Storage
{
    /**
     *
     * @var Redis
     */
    public static $r = null;
    
    public static function encode($data)
    {
        return json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    
    public static function decode($data)
    {
        return json_decode($data, true);
    }
    
    public static function decodeArray($items)
    {
        $res = [];
        foreach ($items as $item)
        {
            $res[] = self::decode($item);
        }
        return $res;
    }
    
    public static function init()
    {
        self::$r = new Redis();
        self::$r->pconnect(
            get_conf("REDIS_HOST", "127.0.0.1"),
            (int)get_conf("REDIS_PORT", 6379)
        );
        self::$r->select((int)get_conf("REDIS_DB", 1));
        
    }
    
    public static function get($key)
    {
        return self::decode(self::$r->get($key));
    }
    
    public static function mGet($keys)
    {
        return self::decodeArray(self::$r->mGet($keys));        
    }
    
    public static function keys($key_tpl)
    {
        return self::$r->keys($key_tpl);
    }
    
    public static function mGetTpl($key_tpl)
    {
        $keys = self::keys($key_tpl);
        return self::mGet($keys);
    }
    
    public static function set($key, $value, $expire=null)
    {
        $v = self::encode($value);
        if ($expire)
        {
            $res = self::$r->set($key, $v, $expire);
        }
        else
        {
            $res = self::$r->set($key, $v);
        }
        return $res;
    }
    
    public static function del($key)
    {
        return self::$r->del($key);
    }
    
    public static function lPush($list_key, $value)
    {
        $v = self::encode($value);
        return self::$r->lPush($list_key, $v);
    }        
    
    public static function rPush($list_key, $value)
    {
        $v = self::encode($value);
        return self::$r->rPush($list_key, $v);
    }        
    
    public static function lPop($list_key)
    {
        $r = self::$r->lPop($list_key);
        return self::decode($r);
    }
    
    public static function rPop($list_key)
    {
        $r = self::$r->rPop($list_key);
        return self::decode($r);
    }
    
    public static function lLen($list_key)
    {
        return self::$r->lLen($list_key);
    }
    
    /**
     * Retrieve a range of elements from a list.
     *
     * @param string $list_key List key name
     * @param int $start Start index
     * @param int $end End index
     * @return array Decoded list elements
     */
    public static function lGetRange($list_key, $start, $end)
    {
        return self::decodeArray(self::$r->lGetRange($list_key, $start, $end));

    }
    
    public static function lGet($list_key, $index)
    {
        return self::decode(self::$r->lGet($list_key, $index));
    }
    
    public static function lRem($list_key, $element, $count=0)
    {
        return self::$r->lRem($list_key, self::encode($element), $count);
    }
    
     
}




