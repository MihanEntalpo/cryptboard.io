<?php

class ApiException extends Exception
{
    static $name = "api_error";
}

class JwtException extends ApiException
{
    static $name = "jwt_error";
}

class AuthException extends ApiException
{
    static $name = "auth_error";
}

class SendException extends ApiException
{
    static $name = "send_error";
}

class TooManyRequests extends ApiException
{
    static $name = "too_many_requests";
}