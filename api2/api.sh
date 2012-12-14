#!/bin/sh

curl -d "username=xiez1989@gmail.com&password=123456" http://127.0.0.1:8000/api2/auth-token/

echo ""

curl -H 'Authorization: Token 24fd3c026886e3121b2ca630805ed425c272cb96' -H 'Accept: application/json; indent=4' http://127.0.0.1:8000/api2/repos/e817caa9-7d61-4921-ac2a-0c387cf8576a/

curl -H "Authorization: Token f2210dacd9c6ccb8133606d94ff8e61d99b477fd" -H 'Accept: application/json; indent=4' http://127.0.0.1:8000/api2/repos/99b758e6-91ab-4265-b705-925367374cf0/dirents/

curl -H "Authorization: Token f2210dacd9c6ccb8133606d94ff8e61d99b477fd" -H 'Accept: application/json; indent=4' http://127.0.0.1:8000/api2/repos/99b758e6-91ab-4265-b705-925367374cf0/dirs/7ffb55a74b6e5490111c24b077bd2cf73fb9796e/
