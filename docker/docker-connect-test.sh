#!/usr/bin/env bash

# This script runs @trezor/connect tests.
# It spins up trezor-user-env and sets required evironment variables.

set -euo pipefail

# Running standalone instance of trezor-user-env
# docker run -it -e SDL_VIDEODRIVER="dummy" -p "9001:9001" -p "21326:21326" -p "21325:21326" registry.gitlab.com/satoshilabs/trezor/trezor-user-env/trezor-user-env

# Tweaking trezor-user-env locally
# docker run -it -e SDL_VIDEODRIVER="dummy" -p "9001:9001" -p "21326:21326" -p "21325:21326" registry.gitlab.com/satoshilabs/trezor/trezor-user-env/trezor-user-env nix-shell
# do your changes using `vi` and run:
# [nix-shell:/trezor-user-env]# ./run.sh

# Ports
# 9001  - websocket server, communication test case > user-env (setup etc...)
# 21326 - trezord proxy. beacuse of trezord CORS check
# 21325 - original trezord port redirected to trezor-user-env proxy

ENVIRONMENT=$1

if [[ "$ENVIRONMENT" != "web" && "$ENVIRONMENT" != "node" ]]; then
  echo "either 'web' or 'node' must be specified as the first argument"
  exit 1
fi

show_usage() {
  echo "Usage: run [OPTIONS] [ARGS]"
  echo ""
  echo "Options:"
  echo "  -c       Disable backend cache. default: enabled"
  echo "  -d       Disable docker. Useful when running own instance of trezor-user-env. default: enabled"
  echo "  -D PATH  Set path to docker executable. Can be replaced with \`podman\`. default: docker"
  echo "  -e       All methods except excluded, example: applySettings,signTransaction"
  echo "  -p       Test pattern"
  echo "  -f       Use specific firmware version, example: 2.1.4, 1.8.0 default: -main"
  echo "  -b       Use specific firmware branch"
  echo "  -o       Use BTC-only firmware of the specified branch"
  echo "  -i       Included methods only, example: applySettings,signTransaction"
  echo "  -s       actual test script. default: 'yarn test:integration'"
  echo "  -u       Firmware url"
  echo "  -m       Firmware model, example: R'"
  echo "  -r       Randomize test order (node only)"
  echo "  -t       Specify transport / bridge version"
}

# default options
FIRMWARE=""
FIRMWARE_URL=""
FIRMWARE_BRANCH=""
FIRMWARE_BTC_ONLY=false
INCLUDED_METHODS=""
EXCLUDED_METHODS=""
DOCKER=true
USE_TX_CACHE=true
USE_WS_CACHE=true
PATTERN=""
FIRMWARE_MODEL=""
RANDOMIZE=false
TRANSPORT="2.0.33"

# echo $OPTARG
# user options
OPTIND=2
while getopts ":p:i:e:f:b:u:m:t:hdcro" opt; do
  case $opt in
  d)
    DOCKER=false
    ;;
  c)
    USE_TX_CACHE=false
    USE_WS_CACHE=false
    ;;
  f)
    FIRMWARE=$OPTARG
    ;;
  b)
    FIRMWARE_BRANCH=$OPTARG
    ;;
  u)
    FIRMWARE_URL=$OPTARG
    ;;
  i)
    INCLUDED_METHODS=$OPTARG
    ;;
  e)
    EXCLUDED_METHODS=$OPTARG
    ;;
  p)
    PATTERN=$OPTARG
    ;;
  o)
    FIRMWARE_BTC_ONLY=true
    ;;
  m)
    FIRMWARE_MODEL=$OPTARG
    ;;
  r)
    RANDOMIZE=true
    ;;
  t)
    TRANSPORT=$OPTARG
    ;;
  h) # Script usage
    show_usage
    exit 0
    ;;
  \?)
    echo "invalid option $OPTARG"
    exit 1
    ;;
  esac
done
shift $((OPTIND - 1))

if [[ $ENVIRONMENT == "node" ]]; then
  SCRIPT="yarn workspace @trezor/connect test:e2e:node"
else
  SCRIPT="yarn workspace @trezor/connect test:e2e:web"
fi

if [[ $FIRMWARE_BTC_ONLY == true && -z $FIRMWARE_BRANCH ]]; then
  echo "BTC-only firmware requires a branch to be specified"
  exit 1
fi

# export essential process.env variables
export TESTS_FIRMWARE=$FIRMWARE
export TESTS_INCLUDED_METHODS=$INCLUDED_METHODS
export TESTS_EXCLUDED_METHODS=$EXCLUDED_METHODS
export TESTS_USE_TX_CACHE=$USE_TX_CACHE
export TESTS_USE_WS_CACHE=$USE_WS_CACHE
export TESTS_PATTERN=$PATTERN
export TESTS_SCRIPT=$SCRIPT
export TESTS_FIRMWARE_URL=$FIRMWARE_URL
export TESTS_FIRMWARE_BRANCH=$FIRMWARE_BRANCH
export TESTS_FIRMWARE_BTC_ONLY=$FIRMWARE_BTC_ONLY
export TESTS_FIRMWARE_MODEL=$FIRMWARE_MODEL
export TESTS_RANDOM=$RANDOMIZE
export TESTS_TRANSPORT=$TRANSPORT

runDocker() {
  docker compose -f ./docker/docker-compose.connect-test.yml up -d
}

run() {

  echo "Testing env: ${ENVIRONMENT}. Using: ${SCRIPT} ${PATTERN}"
  echo "  Firmware: ${TESTS_FIRMWARE}"
  echo "  Firmware model: ${TESTS_FIRMWARE_MODEL}"
  echo "  Firmware from url: ${FIRMWARE_URL}"
  echo "  Firmware from branch: ${FIRMWARE_BRANCH}"
  echo "  Firmware BTC-only: ${FIRMWARE_BTC_ONLY}"
  echo "  Test pattern: $PATTERN"
  echo "  Included methods: ${INCLUDED_METHODS}"
  echo "  Excluded methods: ${EXCLUDED_METHODS}"
  echo "  TxCache: ${USE_TX_CACHE}"
  echo "  WsCache: ${USE_WS_CACHE}"
  echo "  Random: ${RANDOMIZE}"
  echo "  Transport: ${TRANSPORT}"

  if [ $DOCKER = true ]; then
    runDocker

  fi

  $SCRIPT
}

run
