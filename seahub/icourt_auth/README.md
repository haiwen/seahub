# Weixin Login V2 (2018-02-03)

Add following nginx block in test and production to avoid JS cross-domain issue in fetching QR-code via GET request.

nginx:

```
    location /alpha {
          proxy_pass https://alphalawyer.cn/;
          proxy_connect_timeout  36000s;
          proxy_read_timeout  36000s;

    }
```


## prebox (test env)


seahub_settings.py:

```
ALPHALAWYER_WX_LOGIN_INFO_URL = "https://prebox.alphalawyer.cn/alpha/user/api/v1/login/wechat/info"  # used in JS to fetch QR-code via GET
```

## box (production env)

seahub_settings.py:

```
ALPHALAWYER_WX_LOGIN_INFO_URL = "https://box.alphalawyer.cn/alpha/user/api/v1/login/wechat/info"  # used in JS to fetch QR-code via GET
```
