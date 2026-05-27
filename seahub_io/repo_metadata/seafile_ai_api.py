import requests, jwt, time


def parse_response(response):
    if response.status_code >= 400 or response.status_code < 200:
        raise ConnectionError(response.status_code, response.text)
    else:
        try:
            return response.json()
        except:
            pass


class SeafileAIAPI:
    def __init__(self, server_url, secret_key, timeout=90):
        self.timeout = timeout
        self.secret_key = secret_key
        self.server_url = server_url

    def gen_headers(self):
        payload = {'exp': int(time.time()) + 300, }
        token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        return {"Authorization": "Token %s" % token}

    def face_embeddings(self, path, download_token, need_face=False):
        headers = self.gen_headers()
        url = f'{self.server_url}/api/v1/face-embeddings'
        data = {
            'path': path,
            'download_token': download_token,
            'need_face': need_face
        }
        response = requests.post(url, json=data, headers=headers, timeout=self.timeout)
        return parse_response(response)
