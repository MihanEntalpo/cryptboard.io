#!/bin/bash
SCRIPT=`realpath $0`
SCRIPTPATH=`dirname $SCRIPT`

cd "$SCRIPTPATH"
 
docker compose -f ./docker/docker-compose.yml --env-file ./web-app/.env.docker "$@"
