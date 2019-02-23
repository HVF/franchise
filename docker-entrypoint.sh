#!/bin/sh

set -e

npx franchise-client & \
nginx -g 'daemon off;'

exec "$@"
