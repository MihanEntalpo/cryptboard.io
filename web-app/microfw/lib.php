<?php

function ob ( $fn ) {
        ob_start();
        $fn();
        $r = ob_get_contents();
        ob_end_clean();

        return $r;
}

function get_nginx_headers($function_name='getallheaders'){

    $all_headers=array();

    if(function_exists($function_name)){ 

        $all_headers=$function_name();
    }
    else{

        foreach($_SERVER as $name => $value){

            if(substr($name,0,5)=='HTTP_'){

                $name=substr($name,5);
                $name=str_replace('_',' ',$name);
                $name=strtolower($name);
                $name=ucwords($name);
                $name=str_replace(' ', '-', $name);

                $all_headers[$name] = $value; 
            }
            elseif($function_name=='apache_request_headers'){

                $all_headers[$name] = $value; 
            }
        }
    }


    return $all_headers;
}

function render($template, $vars=[], $layout=null, $context=null)
{
    static $last_context = NULL;
    
    if ($context)
    {
        if (is_null($last_context))
        {
            $last_context = $context;
        }
    }
    else
    {
        $context = $last_context;
    }
    
    $rendered = ob(function() use ($vars, $template, $context) {
        if ($vars && is_array($vars))
        {
            extract($vars);
        }
        require(__DIR__ . "/../templates/" . $template . ".php");    
    });
    
    if ($layout)
    {
        $vars['content'] = $rendered;
        $result = ob(function() use ($vars, $layout, $context) {
            extract($vars);
            require(__DIR__ . "/../templates/layouts/" . $layout . ".php");
        });
    }
    else
    {
        $result = $rendered;
    }
    return $result;
}

function get($var, $default)
{
    return isset($_GET[$var]) ? $_GET[$var] : $default;
}

function post($var, $default=null)
{
    
    if ($_SERVER["CONTENT_TYPE"] ==  'application/json')
    {

        $postData = file_get_contents('php://input');
        $data = json_decode($postData, true);

        if ($data)
        {
            if (is_array($data) && isset($data[$var])) return $data[$var];
        }
    }
    
    return isset($_POST[$var]) ? $_POST[$var] : $default;
}



function echo_json($data)
{
    header("Content-type: application/json");
    echo json_encode($data);
    
}

function get_conf($variable, $default=null)
{
    static $file_env_vars;
    
    $env_file = realpath(__DIR__ . "/../.env");
    
    $parse_val = function($val) {
        $val = trim($val);
        if (strtolower($val)=="false")
        {
            $val = false;
        }
        else if (strtolower($val)=="true")
        {
            $val = true;
        }
        else if (preg_match("#^-?[0-9]+$#", $val))
        {
            $val = (int)$val;
        }
        else if (preg_match("#^-?[0-9]+\.[0-9]+$#", $val))
        {
            $val = (float)$val;
        }
        return $val;
    };
    
    if (is_null($file_env_vars))
    {
        $file_env_vars = [];
        
        if (file_exists(__DIR__ . "/../.env"))
        {
            $lines = explode("\n", file_get_contents(__DIR__ . "/../.env"));
            foreach($lines as $line)
            {
                if (preg_match("#^(?P<var>[^=]+)=(?P<val>.*)$#i", $line, $matches))
                {
                    
                    $var = trim($matches['var']);
                    $val = trim($matches['val']);
                    if ($var)
                    {
                        $val = $parse_val($val);
                        $file_env_vars[$var] = $val;
                    }
                }
            }
        }        
    }
    
    $res = $default;
    
    if (getenv($variable) !== false)
    {
        $res = $parse_val(getenv($variable));        
    }
    else if (isset($file_env_vars[$variable]))
    {
        $res = $file_env_vars[$variable];
    }
    
    if ($res instanceof Exception)
    {
        throw $res;
    }
    
    return $res;
}

