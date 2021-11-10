#!/bin/bash
SCRIPT=`realpath $0`
SCRIPTPATH=`dirname $SCRIPT`

cd "$SCRIPTPATH"
docker build  -f ./docker/Dockerfile-webapp . --tag cryptboard-webapp

docker build  -f ./docker/Dockerfile-nginx . --tag cryptboard-nginx
