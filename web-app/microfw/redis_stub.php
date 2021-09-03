<?php

/**
 * This is a stub class for use in PHP Storm and the interface matches with phpredis
 * located here: https://github.com/nicolasff/phpredis
 *
 * Add this as an external library or include it in your project and PHP Storm should
 * be able to provide auto-completion, parameter hinting, etc.
 */
class Redis {

    /** properties */
    const REDIS_NOT_FOUND = 0;
    const REDIS_STRING = 1;
    const REDIS_SET = 2;
    const REDIS_LIST = 3;
    const REDIS_ZSET = 4;
    const REDIS_HASH = 5;

    /** redis mode enum */
    const ATOMIC = 0;
    const MULTI = 1;
    const PIPELINE = 2;

    /** options */
    const OPT_SERIALIZER = 1;
    const OPT_PREFIX = 2;

    /** serializers */
    const SERIALIZER_NONE = 0;
    const SERIALIZER_PHP = 1;
    const SERIALIZER_IGBINARY = 2;

    /** positional descriptors used in some methods */
    const BEFORE = 'before';
    const AFTER = 'after';

    /**
     * Creates a Redis client
     */
    public function __construct() { }

    /**
     * Connects to a Redis instance.
     *
     * @param string $host  can be a host, or the path to a unix domain socket
     * @param int $port  optional, default is 6379
     * @param float $timeout  value in seconds (optional, default is 0 meaning unlimited)
     *
     * @return bool  TRUE on success, FALSE on error
     */
    public function connect($host, $port = 6379, $timeout = 0.0) { }

    /**
     * Connects to a Redis instance (alias for connect)
     *
     * @param string $host  can be a host, or the path to a unix domain socket
     * @param int $port  optional, default is 6379
     * @param float $timeout  value in seconds (optional, default is 0 meaning unlimited)
     *
     * @return bool  TRUE on success, FALSE on error
     */
    public function open($host, $port = 6379, $timeout = 0.0) { }

    /**
     * Connects to a Redis instance or reuse a connection already established with pconnect/popen
     *
     * @param string $host  can be a host, or the path to a unix domain socket
     * @param int $port  optional, default is 6379
     * @param float $timeout  value in seconds (optional, default is 0 meaning unlimited)
     *
     * @return bool  TRUE on success, FALSE on error
     */
    public function pconnect($host, $port = 6379, $timeout = 0.0) { }

    /**
     * Connects to a Redis instance or reuse a connection already established with pconnect/popen (alias for pconnect)
     *
     * @param string $host  can be a host, or the path to a unix domain socket
     * @param int $port  optional, default is 6379
     * @param float $timeout  value in seconds (optional, default is 0 meaning unlimited)
     *
     * @return bool  TRUE on success, FALSE on error
     */
    public function popen($host, $port = 6379, $timeout = 0.0) { }

    /**
     * Disconnects from the Redis instance, except when pconnect is used.
     *
     * @return void
     */
    public function close() { }

    /**
     * Set client option
     *
     * @param int $name  parameter name, e.g. Redis::OPT_SERIALIZER
     * @param mixed $value  parameter value, e.g. Redis::SERIALIZER_PHP
     *
     * @return bool  TRUE on success, FALSE on error
     */
    public function setOption($name, $value) { }

    /**
     * Get client option
     *
     * @param int $name  parameter name
     *
     * @return mixed  parameter value
     */
    public function getOption($name) { }

    /**
     * Check the current connection status
     *
     * @throws RedisException
     * @return string  '+PONG' on success
     */
    public function ping() { }

    /**
     * Get the value related to the specified key
     *
     * @param string $key
     *
     * @return string|bool  If key didn't exist, FALSE is returned. Otherwise, the value related to this key is returned
     */
    public function get($key) { }

    /**
     * Set the string value in argument as value of the key.
     *
     * @param string $key
     * @param mixed $value
     * @param int $ttl  time to live value in seconds; Calling SETEX is preferred if you want a timeout
     *
     * @return bool  TRUE if the command is successful
     */
    public function set($key, $value, $ttl = -1) { }

    /**
     * Set the string value in argument as value of the key, with a time to live
     *
     * @param string $key
     * @param int $ttl  time to live value in seconds
     * @param mixed $value
     *
     * @return bool  TRUE if the command is successful
     */
    public function setex($key, $ttl, $value) { }

    /**
     * Set the string value in argument as value of the key if the key doesn't already exist in the database
     *
     * @param string $key
     * @param mixed $value
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function setnx($key, $value) { }

    /**
     * Remove specified keys
     *
     * @param string|array $key  one or more keys
     * @param string $keys...  undefined number of additional keys
     *
     * @return int  Number of keys deleted
     */
    public function del($key) { }

    /**
     * Remove specified keys (alias for del)
     *
     * @param string|array $key  one or more keys
     * @param string $keys...  undefined number of additional keys
     *
     * @return int  Number of keys deleted
     */
    public function delete($key) { }

    /**
     * Enter transactional mode
     *
     * @param int $mode  transactional mode; optional, default is Redis::MULTI
     *
     * @return Redis
     */
    public function multi($mode = Redis::MULTI) { }

    /**
     * Executes a transaction
     *
     * @return void
     */
    public function exec() { }

    /**
     * Cancels a transaction
     *
     * @return void
     */
    public function discard() { }

    /**
     * Watches a key for modifications by another client. If the key is modified between WATCH and EXEC, the
     * MULTI/EXEC transaction will fail (return FALSE)
     *
     * @param string $key
     *
     * @return void
     */
    public function watch($key) { }

    /**
     * Cancels all the watching of all keys by this client
     *
     * @return void
     */
    public function unwatch() { }

    /**
     * Subscribe to channels. Warning: this function will probably change in the future
     *
     * @param array $channels   an array of channels to subscribe to
     * @param callback $callback  either a string or an array($instance, 'method_name'). The callback function
     *                            receives 3 parameters: the redis instance, the channel name, and the message
     * @return void
     */
    public function subscribe($channels, $callback) { }

    /**
     * Publish messages to channels. Warning: this function will probably change in the future
     *
     * @param string $channel  a channel to publish to
     * @param string $message
     *
     * @return void
     */
    public function publish($channel, $message) { }

    /**
     * Verify if the specified key exists
     *
     * @param string $key
     *
     * @return bool  If the key exists, return TRUE, otherwise return FALSE
     */
    public function exists($key) { }

    /**
     * Increment the number stored at key by one. If the key does not exist it's value is initialized to be 0 first
     *
     * @param string $key
     *
     * @return int  the new value
     */
    public function incr($key) { }

    /**
     * Increment the number stored at key by the specified value. If the key does not exist it's value is initialized
     * to be 0 first
     *
     * @param string $key
     * @param int $value  value that will be added to key
     *
     * @return int  the new value
     */
    public function incrBy($key, $value) { }

    /**
     * Decrement the number stored at key by one. If the key does not exist it's value is initialized to be 0 first
     *
     * @param string $key
     *
     * @return int  the new value
     */
    public function decr($key) { }

    /**
     * Decrement the number stored at key by the specified value. If the key does not exist it's value is initialized
     * to be 0 first
     *
     * @param string $key
     * @param int $value  value that will be subtracted from key
     *
     * @return int  the new value
     */
    public function decrBy($key, $value) { }

    /**
     * Get the values of all the specified keys. If one or more keys dont exist, the array will contain FALSE at the
     * position of the key
     *
     * @param array $keys  Array containing the list of the keys
     *
     * @return array  Array containing the values related to keys in argument
     */
    public function getMultiple($keys) { }

    /**
     * Adds the string value to the head (left) of the list. Creates the list if the key didn't exist. If the key
     * exists and is not a list, FALSE is returned
     *
     * @param string $key
     * @param mixed $value  value to push in key
     *
     * @return int|bool  The new length of the list in case of success, FALSE in case of Failure
     */
    public function lPush($key, $value) { }

    /**
     * Adds the string value to the tail (right) of the list. Creates the list if the key didn't exist. If the key
     * exists and is not a list, FALSE is returned
     *
     * @param string $key
     * @param mixed $value  value to push in key
     *
     * @return int|bool  The new length of the list in case of success, FALSE in case of Failure
     */
    public function rPush($key, $value) { }

    /**
     * Adds the string value to the head (left) of the list if the list exist
     *
     * @param string $key
     * @param mixed $value  value to push in key
     *
     * @return int|bool  The new length of the list in case of success, FALSE in case of Failure
     */
    public function lPushx($key, $value) { }

    /**
     * Adds the string value to the tail (right) of the list if the list exist
     *
     * @param string $key
     * @param mixed $value  value to push in key
     *
     * @return int|bool  The new length of the list in case of success, FALSE in case of Failure
     */
    public function rPushx($key, $value) { }

    /**
     * Return and remove the first element of the list
     *
     * @param string $key
     *
     * @return string|bool  if command executed successfully BOOL FALSE in case of failure (empty list, not list)
     */
    public function lPop($key) { }

    /**
     * Return and remove the last element of the list
     *
     * @param string $key
     *
     * @return string|bool  if command executed successfully BOOL FALSE in case of failure (empty list, not list)
     */
    public function rPop($key) { }

    /**
     * Is a blocking lPop primitive. If at least one of the lists contains at least one element, the element will be
     * popped from the head of the list and returned to the caller. If all the list identified by the keys passed in
     * arguments are empty, blPop will block during the specified timeout until an element is pushed to one of those
     * lists. This element will be popped
     *
     * @param string|array $keys... one or more keys as an array or multiple parameters
     * @param int $timeout  timeout in seconds
     *
     * @return array  array('listName', 'element')
     */
    public function blPop($keys, $timeout) { }

    /**
     * Is a blocking rPop primitive. If at least one of the lists contains at least one element, the element will be
     * popped from the tail of the list and returned to the caller. If all the list identified by the keys passed in
     * arguments are empty, blPop will block during the specified timeout until an element is pushed to one of those
     * lists. This element will be popped
     *
     * @param string|array $keys... one or more keys as an array or multiple parameters
     * @param int $timeout  timeout in seconds
     *
     * @return array  array('listName', 'element')
     */
    public function brPop($keys, $timeout) { }

    /**
     * Returns the size of a list identified by Key. If the list didn't exist or is empty, the command returns 0. If
     * the data type identified by Key is not a list, the command return FALSE
     *
     * @param string $key
     *
     * @return int|bool  The size of the list identified by Key exists.
     *                   FALSE if the data type identified by Key is not list
     */
    public function lSize($key) { }

    /**
     * Return the specified element of the list stored at the specified key. 0 the first element, 1 the second ... -1
     * the last element, -2 the penultimate ... Return FALSE in case of a bad index or a key that doesn't point to a
     * list
     *
     * @param string $key
     * @param int $index  0-based index; -1 for last element, etc
     *
     * @return string|bool  the element at this index; FALSE if the key dentifies a non-string data type, or no value
     *                      corresponds to this index in the list identified by key
     */
    public function lIndex($key, $index) { }

    /**
     * Return the specified element of the list stored at the specified key. 0 the first element, 1 the second ... -1
     * the last element, -2 the penultimate ... Return FALSE in case of a bad index or a key that doesn't point to a
     * list (alias of lIndex)
     *
     * @param string $key
     * @param int $index  0-based index; -1 for last element, etc
     *
     * @return string|bool  the element at this index; FALSE if the key dentifies a non-string data type, or no value
     *                      corresponds to this index in the list identified by key
     */
    public function lGet($key, $index) { }

    /**
     * Set the list at index with the new value
     *
     * @param string $key
     * @param int $index  0-based index; -1 for last element, etc
     * @param mixed $value
     *
     * @return bool  TRUE if the new value is set. FALSE if the index is out of range, or data type identified by
     *               key is not a list
     */
    public function lSet($key, $index, $value) { }

    /**
     * Returns the specified elements of the list stored at the specified key in the range [start, end]. start and
     * stop are interpreted as indices: 0 the first element, 1 the second ... -1 the last element, -2 the
     * penultimate ...
     *
     * @param string $key
     * @param int $start  0-based start index, inclusive
     * @param int $end  0-based end index, inclusive
     *
     * @return array  containing the values in specified range
     */
    public function lRange($key, $start, $end) { }

    /**
     * Returns the specified elements of the list stored at the specified key in the range [start, end]. start and
     * stop are interpreted as indices: 0 the first element, 1 the second ... -1 the last element, -2 the
     * penultimate ... (alias of lRange)
     *
     * @param string $key
     * @param int $start  0-based start index, inclusive
     * @param int $end  0-based end index, inclusive
     *
     * @return array  containing the values in specified range
     */
    public function lGetRange($key, $start, $end) { }

    /**
     * Trims an existing list so that it will contain only a specified range of elements
     *
     * @param string $key
     * @param int $start  0-based start index, inclusive
     * @param int $end  0-based end index, inclusive
     *
     * @return bool  TRUE on success. FALSE if the key identify a non-list value
     */
    public function lTrim($key, $start, $end) { }

    /**
     * Trims an existing list so that it will contain only a specified range of elements (alias of lTrim)
     *
     * @param string $key
     * @param int $start  0-based start index, inclusive
     * @param int $end  0-based end index, inclusive
     *
     * @return bool  TRUE on success. FALSE if the key identify a non-list value
     */
    public function listTrim($key, $start, $end) { }

    /**
     * Removes the first count occurences of the value element from the list. If count is zero, all the matching
     * elements are removed. If count is negative, elements are removed from tail to head
     *
     * @param string $key
     * @param string $value  value to remove
     * @param int $count  number of matching elements to remove; 0 to remove all matching elements
     *
     * @return int|bool  the number of elements removed; FALSE if the value identified by key is not a list
     */
    public function lRem($key, $value, $count) { }

    /**
     * Removes the first count occurences of the value element from the list. If count is zero, all the matching
     * elements are removed. If count is negative, elements are removed from tail to head (alias of lRem)
     *
     * @param string $key
     * @param string $value  value to remove
     * @param int $count  number of matching elements to remove; 0 to remove all matching elements
     *
     * @return int|bool  the number of elements removed; FALSE if the value identified by key is not a list
     */
    public function lRemove($key, $value, $count) { }

    /**
     * Insert value in the list before or after the pivot value. the parameter options specify the position of the
     * insert (before or after). If the list didn't exists, or the pivot didn't exists, the value is not inserted
     *
     * @param string $key
     * @param string $position  Redis::BEFORE, Redis::AFTER
     * @param string $pivot  pivot value
     * @param string $value  value to insert
     *
     * @return int  number of elements in the list, -1 if the pivot didn't exist
     */
    public function lInsert($key, $position, $pivot, $value) { }

    /**
     * Adds a value to the set value stored at key. If this value is already in the set, FALSE is returned
     *
     * @param string $key
     * @param string $value
     *
     * @return bool  TRUE if value didn't exist and was added successfully, FALSE if the value is already present
     */
    public function sAdd($key, $value) { }

    /**
     * Removes the specified member from the set value stored at key
     *
     * @param string $key
     * @param string $member
     *
     * @return bool  TRUE if the member was present in the set, FALSE if it didn't
     */
    public function sRem($key, $member) { }

    /**
     * Removes the specified member from the set value stored at key (alias for sRem)
     *
     * @param string $key
     * @param string $member
     *
     * @return bool  TRUE if the member was present in the set, FALSE if it didn't
     */
    public function sRemove($key, $member) { }

    /**
     * Moves the specified member from the set at srcKey to the set at dstKey
     *
     * @param string $srcKey
     * @param string $dstKey
     * @param string $member
     *
     * @return bool  If the operation is successful, return TRUE. If the srcKey and/or dstKey didn't exist, and/or
     *               the member didn't exist in srcKey, FALSE is returned
     */
    public function sMove($srcKey, $dstKey, $member) { }

    /**
     * Checks if value is a member of the set stored at the key key
     *
     * @param string $key
     * @param string $value
     *
     * @return bool  TRUE if value is a member of the set at key key, FALSE otherwise
     */
    public function sIsMember($key, $value) { }

    /**
     * Checks if value is a member of the set stored at the key key (alias for sIsMember)
     *
     * @param string $key
     * @param string $value
     *
     * @return bool  TRUE if value is a member of the set at key key, FALSE otherwise
     */
    public function sContains($key, $value) { }

    /**
     * Returns the cardinality of the set identified by key
     *
     * @param string $key
     *
     * @return int  the cardinality of the set identified by key, 0 if the set doesn't exist
     */
    public function sCard($key) { }


    /**
     * Returns the cardinality of the set identified by key (alias for sCard)
     *
     * @param string $key
     *
     * @return int  the cardinality of the set identified by key, 0 if the set doesn't exist
     */
    public function sSize($key) { }

    /**
     * Removes and returns a random element from the set value at key
     *
     * @param string $key
     *
     * @return string|bool  removed value; FALSE if set identified by key is empty or doesn't exist
     */
    public function sPop($key) { }

    /**
     * Returns a random element from the set value at Key, without removing it
     *
     * @param string $key
     *
     * @return string|bool  value from set; FALSE if set identified by key is empty or doesn't exist
     */
    public function sRandMember($key) { }

    /**
     * Returns the members of a set resulting from the intersection of all the sets held at the specified keys. If
     * just a single key is specified, then this command produces the members of this set. If one of the keys is
     * missing, FALSE is returned
     *
     * @param string $key1
     * @param string $key2
     * @param string $keys...  one or more additional set keys as parameters
     *
     * @return array|bool  Array, contain the result of the intersection between those keys. If the intersection
     *                     between the different sets is empty, the return value will be empty array; FALSE if any
     *                     of the provided keys is missing
     */
    public function sInter($key1, $key2, $keys) { }

    /**
     * Performs a sInter command and stores the result in a new set
     *
     * @param string $dstKey  the key to store the intersection into
     * @param string $key1
     * @param string $key2
     * @param string $keys...  one or more additional set keys as parameters
     *
     * @return int|bool  The cardinality of the resulting set, or FALSE in case of a missing key
     */
    public function sInterStore($dstKey, $key1, $key2, $keys) { }

    /**
     * Performs the union between N sets and returns it
     *
     * @param string $key1
     * @param string $key2
     * @param string $keys...  one or more additional set keys as parameters
     *
     * @return array  The union of all these sets
     */
    public function sUnion($key1, $key2, $keys) { }

    /**
     * Performs the same action as sUnion, but stores the result in the first key
     *
     * @param string $dstKey  the key to store the union into
     * @param string $key1
     * @param string $key2
     * @param string $keys...  one or more additional set keys as parameters
     *
     * @return array  The union of all these sets
     */
    public function sUnionStore($dstKey, $key1, $key2, $keys) { }

    /**
     * Performs the difference between N sets and returns it
     *
     * @param string $key1
     * @param string $key2
     * @param string $keys...  one or more additional set keys as parameters
     *
     * @return array  The difference of the first set with all the others
     */
    public function sDiff($key1, $key2, $keys) { }

    /**
     * Performs the same action as sDiff, but stores the result in the first key
     *
     * @param string $dstKey  the key to store the diff into
     * @param string $key1
     * @param string $key2
     * @param string $keys...  one or more additional set keys as parameters
     *
     * @return array  The difference of the first set with all the others
     */
    public function sDiffStore($dstKey, $key1, $key2, $keys) { }

    /**
     * Returns the contents of a set
     *
     * @param string $key
     *
     * @return array  An array of elements, the contents of the set
     */
    public function sMembers($key) { }

    /**
     * Returns the contents of a set (alias for sMembers)
     *
     * @param string $key
     *
     * @return array  An array of elements, the contents of the set
     */
    public function sGetMembers($key) { }

    /**
     * Sets a value and returns the previous entry at that key
     *
     * @param string $key
     * @param string $value
     *
     * @return string  the previous value located at this key
     */
    public function getSet($key, $value) { }

    /**
     * Returns a random key
     *
     * @return string  an existing key in redis
     */
    public function randomKey() { }

    /**
     * Switches to a given database
     *
     * @param int $dbIndex  the database number to switch to
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function select($dbIndex) { }

    /**
     * Moves a key to a different database
     *
     * @param string $key  the key to move
     * @param int $dbIndex  the database number to move the key to
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function move($key, $dbIndex) { }

    /**
     * Renames a key
     *
     * @param string $srcKey  the key to rename
     * @param string $dstKey  the new name for the key
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function rename($srcKey, $dstKey) { }

    /**
     * Same as rename, but will not replace a key if the destination already exists. This is the same behaviour as
     * setNx
     *
     * @param string $srcKey  the key to rename
     * @param string $dstKey  the new name for the key
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function renameNx($srcKey, $dstKey) { }

    /**
     * Sets an expiration date (a timeout) on an item
     *
     * @param string $key  The key that will disappear
     * @param int $ttl  the key's remaining time to live, in seconds
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function setTimeout($key, $ttl) { }

    /**
     * Sets an expiration date (a timeout) on an item (alias for setTimeout)
     *
     * @param string $key  The key that will disappear
     * @param int $ttl  the key's remaining time to live, in seconds
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function expire($key, $ttl) { }

    /**
     * Sets an expiration date (a timestamp) on an item
     *
     * @param string $key  The key that will disappear
     * @param int $timestamp  The key's date of death, in seconds from Epoch time
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function expireAt($key, $timestamp) { }

    /**
     * Returns the keys that match a certain pattern
     *
     * @param string $pattern  pattern, using '*' as a wildcard
     *
     * @return array  The keys that match a certain pattern
     */
    public function keys($pattern) { }

    /**
     * Returns the keys that match a certain pattern (alias for keys)
     *
     * @param string $pattern  pattern, using '*' as a wildcard
     *
     * @return array  The keys that match a certain pattern
     */
    public function getKeys($pattern) { }

    /**
     * Return the current database's size
     *
     * @return int  DB size, in number of keys
     */
    public function dbSize() { }

    /**
     * Authenticate the connection using a password. Warning: The password is sent in plain-text over the network
     *
     * @param string $password
     *
     * @return bool  TRUE if the connection is authenticated, FALSE otherwise
     */
    public function auth($password) { }

    /**
     * Starts the background rewrite of AOF (Append-Only File)
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function bgrewriteaof() { }

    /**
     * Change the slave status for the current host
     *
     * @param string|null $host  set current host as slave of the provided host; null to stop being a slave
     * @param int $port  set current host as slave of the provided host on the provided port; default 6379
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function slaveof($host = null, $port = 6379) { }

    /**
     * Describes the object pointed to by a key
     *
     * @param string $info  The information to retrieve ('encoding', 'refcount', 'idletime')
     * @param string $key
     *
     * @return string|int|bool  value; string for 'encoding', int for 'refcount' and 'idletime'; FALSE if the key
     *                          doesn't exist
     */
    public function object($info, $key) { }

    /**
     * Performs a synchronous save
     *
     * @return bool  TRUE in case of success, FALSE in case of failure. If a save is already running, this command
     *               will fail and return FALSE
     */
    public function save() { }

    /**
     * Performs a background save
     *
     * @return bool  TRUE in case of success, FALSE in case of failure. If a save is already running, this command
     *               will fail and return FALSE
     */
    public function bgsave() { }

    /**
     * Returns the timestamp of the last disk save
     *
     * @return int  timestamp
     */
    public function lastSave() { }

    /**
     * Returns the type of data pointed by a given key
     *
     * @param string $key
     *
     * @return int  type; one of Redis::REDIS_STRING, Redis::REDIS_SET, Redis::REDIS_LIST, etc
     */
    public function type($key) { }

    /**
     * Append specified string to the string stored in specified key
     *
     * @param string $key
     * @param string $value
     *
     * @return int  Size of the value after the append
     */
    public function append($key, $value) { }

    /**
     * Return a substring of a larger string
     *
     * @param string $key
     * @param int $start  0-based start position, inclusive
     * @param int $end  0-based end position, inclusive
     *
     * @return string  the substring
     */
    public function getRange($key, $start, $end) { }

    /**
     * Changes a substring of a larger string
     *
     * @param string $key
     * @param int $offset  0-based offset where to start
     * @param string $value
     *
     * @return int   the length of the string after it was modified
     */
    public function setRange($key, $offset, $value) { }

    /**
     * Get the length of a string value
     * @param  $key
     * @return void
     */
    public function strlen($key) { }

    /**
     * Return a single bit out of a larger string
     *
     * @param string $key
     * @param int $offset  0-based index of bit to return
     *
     * @return int  the bit value
     */
    public function getBit($key, $offset) { }

    /**
     * Changes a single bit of a string
     *
     * @param string $key
     * @param int $offset  0-based index of bit to set
     * @param int|bool $value  bit value as 0/false or 1/true
     *
     * @return int  previous value of the bit
     */
    public function setBit($key, $offset, $value) { }

    /**
     * Removes all entries from the current database
     *
     * @return bool  Always TRUE
     */
    public function flushDB() { }

    /**
     * Removes all entries from all databases
     *
     * @return bool  Always TRUE
     */
    public function flushAll() { }

    /**
     * Sort a set and return the sorted members
     *
     * @param string $key
     * @param array $options  key-value options
     *                  - 'by' string
     *                  - 'limit' array
     *                  - 'get' string
     *                  - 'sort' string  'asc' or 'desc' for ascending vs. descending order
     *                  - 'alpha' bool  whether to sort by alpha
     *                  - 'store' string  key to store sorted set in
     *
     * @return array  An array of values, or a number corresponding to the number of elements stored if that was used
     */
    public function sort($key, $options = array()) { }

    /**
     * Returns an associative array of strings and integers, with the following keys:
     *   'redis_version', 'arch_bits', 'uptime_in_seconds', 'uptime_in_days', 'connected_clients', 'connected_slaves',
     *   'used_memory', 'changes_since_last_save', 'bgsave_in_progress', 'last_save_time', 'total_connections_received',
     *   'total_commands_processed', 'role'
     *
     * @return array
     */
    public function info() { }

    /**
     * Returns the time to live left for a given key, in seconds. If the key doesn't exist, FALSE is returned
     *
     * @param string $key
     *
     * @return int|bool  time to live in seconds
     */
    public function ttl($key) { }

    /**
     * Remove the expiration timer from a key
     *
     * @param string $key
     *
     * @return bool  TRUE if a timeout was removed, FALSE if the key didn’t exist or didn’t have an expiration timer
     */
    public function persist($key) { }

    /**
     * Sets multiple key-value pairs in one atomic command
     *
     * @param array $pairs  key-value pairs to set
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function mset($pairs) { }

    /**
     * Sets multiple key-value pairs in one atomic command, setting only keys that did not exist
     *
     * @param array $pairs  key-value pairs to set
     *
     * @return bool  TRUE if all keys were set, FALSE in case of failure or if one or more keys not set
     */
    public function msetnx($pairs) { }

    /**
     * Pops a value from the tail of a list, and pushes it to the front of another list. Also return this value
     *
     * @param string $srcKey
     * @param string $dstKey
     *
     * @return string|bool  The element that was moved in case of success, FALSE in case of failure
     */
    public function rpoplpush($srcKey, $dstKey) { }

    /**
     * A blocking version of rpoplpush, with an integral timeout in the third parameter
     *
     * @param string $srcKey
     * @param string $dstKey
     * @param $timeout int  blocking timeout in seconds
     *
     * @return string|bool  The element that was moved in case of success, FALSE in case of timeout
     */
    public function brpoplpush($srcKey, $dstKey, $timeout = 0.0) { }

    /**
     * Adds the specified member with a given score to the sorted set stored at key
     *
     * @param string $key
     * @param double $score
     * @param string $value
     *
     * @return int  1 if the element is added. 0 otherwise
     */
    public function zAdd($key, $score, $value) { }

    /**
     * Returns a range of elements from the ordered set stored at the specified key, with values in the range
     * [start, end]. start and stop are interpreted as zero-based indices: 0 the first element, 1 the second ...
     * -1 the last element, -2 the penultimate ...
     *
     * @param string $key
     * @param int $start  0-based start index, inclusive
     * @param int $end  0-based end index, inclusive
     * @param bool $withScores  whether to include results with scores
     *
     * @return array  Array containing the values in specified range
     */
    public function zRange($key, $start, $end, $withScores = false) { }

    /**
     * Deletes a specified member from the ordered set
     *
     * @param string $key
     * @param $string $member
     *
     * @return int  1 on success, 0 on failure
     */
    public function zDelete($key, $member) { }

    /**
     * Deletes a specified member from the ordered set (alias of zDelete)
     *
     * @param string $key
     * @param $string $member
     *
     * @return int  1 on success, 0 on failure
     */
    public function zRem($key, $member) { }

    /**
     * Returns the elements of the sorted set stored at the specified key in the range [start, end] in reverse order.
     * start and stop are interpretated as zero-based indices: 0 the first element, 1 the second ... -1 the last
     * element, -2 the penultimate ...
     *
     * @param string $key
     * @param int $start  0-based start index, inclusive
     * @param int $end  0-based end index, inclusive
     * @param bool $withScores  whether to include results with scores
     *
     * @return array  Array containing the values in specified range
     */
    public function zRevRange($key, $start, $end, $withScores = false) { }

    /**
     * Returns the elements of the sorted set stored at the specified key which have scores in the range [start,end].
     * Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also valid limits
     *
     * @param string $key
     * @param double|string $start  Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also valid limits
     * @param double|string $end
     * @param array $options  key-value options
     *                          'withscores' bool
     *                          'limit' array  (offset, count)
     *
     * @return array  Array containing the values in specified range
     */
    public function zRangeByScore($key, $start, $end, $options = array()) { }

    /**
     * Returns the elements of the sorted set stored at the specified key which have scores in the range [start,end]
     * in reverse order. Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also
     * valid limits
     *
     * @param string $key
     * @param double|string $start  Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also valid limits
     * @param double|string $end
     * @param array $options  key-value options
     *                          'withscores' bool
     *                          'limit' array  (offset, count)
     *
     * @return array  Array containing the values in specified range
     */
    public function zRevRangeByScore($key, $start, $end, $options = array()) { }

    /**
     * Returns the number of elements of the sorted set stored at the specified key which have scores in the range
     * [start,end]. Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also valid
     * limits
     *
     * @param string $key
     * @param double|string $start  Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also valid limits
     * @param double|string $end
     *
     * @return int  the size of a corresponding zRangeByScore
     */
    public function zCount($key, $start, $end) { }

    /**
     * Deletes the elements of the sorted set stored at the specified key which have scores in the range [start,end]
     *
     * @param string $key
     * @param double|string $start  Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also valid limits
     * @param double|string $end
     *
     * @return int  The number of values deleted from the sorted set
     */
    public function zRemRangeByScore($key, $start, $end) { }

    /**
     * Deletes the elements of the sorted set stored at the specified key which have scores in the range [start,end]
     * (alias for zRemRangeByScore)
     *
     * @param string $key
     * @param double|string $start  Adding a parenthesis before start or end excludes it from the range. +inf and -inf are also valid limits
     * @param double|string $end
     *
     * @return int  The number of values deleted from the sorted set
     */
    public function zDeleteRangeByScore($key, $start, $end) { }

    /**
     * Deletes the elements of the sorted set stored at the specified key which have rank in the range [start,end]
     *
     * @param string $key
     * @param int $start
     * @param int $end
     * @param array $options  key-value options: 'withscores' bool  whether to include scores in return value
     *
     * @return int|array  The number of values deleted from the sorted set; if withscores, array of deleted values with scores
     */
    public function zRemRangeByRank($key, $start, $end, $options = array()) { }

    /**
     * Deletes the elements of the sorted set stored at the specified key which have rank in the range [start,end]
     * (alias of zRemRangeByRank)
     *
     * @param string $key
     * @param int $start
     * @param int $end
     * @param array $options  key-value options: 'withscores' bool  whether to include scores in return value
     *
     * @return int|array  The number of values deleted from the sorted set; if withscores, array of deleted values with scores
     */
    public function zDeleteRangeByRank($key, $start, $end, $options = array()) { }

    /**
     * Returns the cardinality of an ordered set
     *
     * @param string $key
     *
     * @return int  the set's cardinality
     */
    public function zSize($key) { }

    /**
     * Returns the cardinality of an ordered set (alias for zSize)
     *
     * @param string $key
     *
     * @return int  the set's cardinality
     */
    public function zCard($key) { }

    /**
     * Returns the score of a given member in the specified sorted set
     *
     * @param string $key
     * @param string $member
     *
     * @return double  score
     */
    public function zScore($key, $member) { }

    /**
     * Returns the rank of a given member in the specified sorted set, starting at 0 for the item with the smallest
     * score.
     *
     * @param string $key
     * @param string $member
     *
     * @return double  the item's score
     */
    public function zRank($key, $member) { }

    /**
     * Returns the rank of a given member in the specified sorted set in reverse order
     *
     * @param string $key
     * @param string $member
     *
     * @return double  the item's score
     */
    public function zRevRank($key, $member) { }

    /**
     * Increments the score of a member from a sorted set by a given amount
     *
     * @param string $key
     * @param double $value  value that will be added to the member's score
     * @param string $member
     *
     * @return double  the new value
     */
    public function zIncrBy($key, $value, $member) { }

    /**
     * Creates an union of sorted sets given in second argument. The result of the union will be stored in the sorted
     * set defined by the first argument. The third optionnel argument defines weights to apply to the sorted sets in
     * input. In this case, the weights will be multiplied by the score of each element in the sorted set before
     * applying the aggregation. The forth argument defines the AGGREGATE option which specify how the results of the
     * union are aggregated
     *
     * @param string $keyOutput  results output to this key
     * @param array $zSetKeys  array of zSet keys
     * @param array $weights  parallel array of weights to zSetKeys
     * @param string $function  aggregation function: 'SUM', 'MIN', or 'MAX'
     *
     * @return long  The number of values in the new sorted set
     */
    public function zUnion($keyOutput, $zSetKeys, $weights = array(), $function) { }

    /**
     * Creates an intersection of sorted sets given in second argument. The result of the union will be stored in the
     * sorted set defined by the first argument. The third optionnel argument defines weights to apply to the sorted
     * sets in input. In this case, the weights will be multiplied by the score of each element in the sorted set
     * before applying the aggregation. The forth argument defines the AGGREGATE option which specify how the results
     * of the union are aggregated
     *
     * @param string $keyOutput  results output to this key
     * @param array $zSetKeys  array of zSet keys
     * @param array $weights  parallel array of weights to zSetKeys
     * @param string $function  aggregation function: 'SUM', 'MIN', or 'MAX'
     *
     * @return long  The number of values in the new sorted set
     */
    public function zInter($keyOutput, $zSetKeys, $weights = array(), $function) { }

    /**
     * Adds a value to the hash stored at key. If this value is already in the hash, FALSE is returned
     *
     * @param string $key  key of hash structure
     * @param string $hashKey  hash key
     * @param string $value  value to set
     *
     * @return int|bool  1 if value didn't exist and was added successfully, 0 if the value was already present and
     *                   was replaced, FALSE if there was an error
     */
    public function hSet($key, $hashKey, $value) { }

    /**
     * Adds a value to the hash stored at key only if this field isn't already in the hash
     *
     * @param string $key
     * @param string $hashKey
     * @param string $value
     *
     * @return bool  TRUE if the key was set, FALSE if it was already present
     */
    public function hSetNx($key, $hashKey, $value) { }

    /**
     * Gets a value from the hash stored at key. If the hash table doesn't exist, or the key doesn't exist, FALSE is
     * returned
     *
     * @param string $key
     * @param string $hashKey
     *
     * @return string|bool  The value, if the command executed successfully BOOL FALSE in case of failure
     */
    public function hGet($key, $hashKey) { }

    /**
     * Returns the length of a hash, in number of items
     *
     * @param string $key
     *
     * @return int|bool  the number of items in a hash, FALSE if the key doesn't exist or isn't a hash
     */
    public function hLen($key) { }

    /**
     * Removes a value from the hash stored at key. If the hash table doesn't exist, or the key doesn't exist, FALSE
     * is returned
     *
     * @param string $key
     * @param string $hashKey
     *
     * @return bool  TRUE in case of success, FALSE in case of failure
     */
    public function hDel($key, $hashKey) { }

    /**
     * Returns the keys in a hash, as an array of strings
     *
     * @param string $key
     *
     * @return array  An array of elements, the keys of the hash. This works like PHP's array_keys()
     */
    public function hKeys($key) { }

    /**
     * Returns the values in a hash, as an array of strings
     *
     * @param string $key
     *
     * @return array  An array of elements, the values of the hash. This works like PHP's array_values()
     */
    public function hVals($key) { }

    /**
     * Returns the whole hash, as an array of strings indexed by strings
     *
     * @param string $key
     *
     * @return array  An array of elements, the contents of the hash
     */
    public function hGetAll($key) { }

    /**
     * Verify if the specified member exists in a key
     *
     * @param string $key
     * @param string $memberKey
     *
     * @return bool  If the member exists in the hash table, return TRUE, otherwise return FALSE
     */
    public function hExists($key, $memberKey) { }

    /**
     * Increments the value of a member from a hash by a given amount
     *
     * @param string $key
     * @param string $member
     * @param int $value  value that will be added to the member's value
     *
     * @return int  the new value
     */
    public function hIncrBy($key, $member, $value) { }

    /**
     * Fills in a whole hash. Non-string values are converted to string, using the standard (string) cast. NULL
     * values are stored as empty strings
     *
     * @param string $key
     * @param array $members  key-value pairs to set
     *
     * @return bool
     */
    public function hMset($key, $members) { }

    /**
     * Retrieve the values associated to the specified fields in the hash
     *
     * @param string $key
     * @param array $memberKeys  one or more keys to get
     *
     * @return array  An array of elements, the values of the specified fields in the hash, with the hash keys as array keys
     */
    public function hMget($key, $memberKeys) { }

}

class RedisException extends Exception { }
