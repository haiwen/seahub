#!/bin/sh

# seafile-docs branch rebuild is triggered only if the 6.3 branch status is successful
if [ $TRAVIS_BRANCH != "6.3" ]; then
    exit
fi;

body='{
"request": {
"branch":"seafile-docs"
}}'
    
curl -s -X POST \
   -H "Content-Type: application/json" \
   -H "Accept: application/json" \
   -H "Travis-API-Version: 3" \
   -H "Authorization: ${TRAVIS_API_ACCESS_TOKEN}" \
   -d "$body" \
   https://api.travis-ci.org/repo/haiwen%2Fseahub/requests
