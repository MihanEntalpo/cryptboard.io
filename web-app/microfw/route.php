<?php

require_once __DIR__ . "/api_exceptions.php";

class Router 
{
    static $routes;
    
    static $middlewares;
    
    public static function addMiddleware($handler)
    {
        if (is_null(self::$middlewares))
        {
            self::$middlewares = [];
        }
        
        self::$middlewares[] = $handler;
    }
    
    public static function throttle($uid, $route_name, $min_msec_between_requests=1000)
    {
        $current = microtime(true);
        
        $last_request_mtime = Storage::get("last_request_mtime:$uid:$route_name");
        
        Storage::set("last_request_mtime:$uid:$route_name", $current, $min_msec_between_requests * 50 / 1000);
        
        if (!$last_request_mtime)
        {
            return;
        }
        else
        {
            $delta_sec = $current - $last_request_mtime;
            if ($delta_sec < $min_msec_between_requests / 1000)
            {
                throw new TooManyRequests("there should be pause between requests more than $min_msec_between_requests milliseconds");
            }
        }
    }
    
    public static function add($url, $handler, $methods=null)
    {
        if (is_null(self::$routes))
        {
            self::$routes = [];
        }
        
        if (is_array($url))
        {
            $url = [
                "pattern" => $url['pattern'] ?? "#.*#",
                "type" => $url['type'] ?? 'regexp'
            ];
        }
        else if (is_string($url))
        {
            $url = [
                "pattern" => $url,
                "type" => "plain"
            ];
        }

        self::$routes[] = [
            "url" => $url,
            "method" => array_map("strtoupper", $methods ?: []) ?: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            "handler" => $handler
        ];      
    }
    
    public static function getRoute($url)
    {
        $res = null;
        foreach (self::$routes as $route)
        {
            $url_type = $route['url']['type'];
            $url_pattern = $route['url']['pattern'];
            
            if ($url_type == "plain")
            {
                if ($url == $url_pattern)
                {
                    $res = $route;
                    break;
                }
            }
            else if ($url_type == "regexp")
            {
                if (preg_match($url_pattern, $url, $matches))
                {
                    $route['matches'] = $matches;
                    $res = $route;
                    break;
                }
            }
        }
        return $res;
    }
    
    public static function run()
    {
        $url = $_SERVER['REQUEST_URI'];
        
        $route = self::getRoute($url);
        
        foreach (self::$middlewares as $mw)
        {
            $mw();
        }
        
        if (!$route)
        {
            header("HTTP/1.0 404 Not Found");
            echo $url;            
        }
        else
        {
            if (!in_array($_SERVER['REQUEST_METHOD'], $route['method'])) 
            {
                header("HTTP/1.0 405 Method not allowed");
            }
            
            $res = null;
            
            try
            {
		if (extension_loaded('newrelic')) {
			if ($route['url']['type']=='plain') { newrelic_name_transaction($route['url']['pattern']); }
		}


                $raw_content = ob(function() use (&$res, $route){
                    $res = $route['handler']($route);
                });
            
            }
            catch(ApiException $e)
            {
                echo_error($e::$name, $e->getMessage(), 200);
                return;
            }
            catch(\Throwable $e)
            {
                echo_error("internal_error", $e->getMessage());
                return;
            }
            
            if (is_array($res))
            {
                header("Content-type: application/json");
                echo json_encode([
                    "data"=>$res,
                    "error"=>false,
                    "message"=>""
                ]);
                return;
            }
            else
            {
                echo $raw_content;
            }
            
        }
    }

}


