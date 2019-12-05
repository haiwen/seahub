#!/bin/sh

body='{
"request": {
"branch":"seafile-docs"
}}'
    
curl -s -X POST \
   -H "Content-Type: application/json" \
   -H "Accept: application/json" \
   -H "Travis-API-Version: 3" \
   -H "Authorization: token ${TRAVIS_API_ACCESS_TOKEN}" \
   -d "$body" \
   https://api.travis-ci.org/repo/haiwen%2Fseahub/requests
