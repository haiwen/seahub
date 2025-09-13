import cookie from 'react-cookies';
import {siteRoot} from './constants';
import axios from 'axios';

class CustomAPI {

    init({server, username, password, token}) {
        this.server = server;
        this.username = username;
        this.password = password;
        this.token = token;  //none
        if (this.token && this.server) {
            this.req = axios.create({
                baseURL: this.server,
                headers: {'Authorization': 'Token ' + this.token},
            });
        }
        return this;
    }

    initForSeahubUsage({siteRoot, xcsrfHeaders}) {
        if (siteRoot && siteRoot.charAt(siteRoot.length - 1) === '/') {
            var server = siteRoot.substring(0, siteRoot.length - 1);
            this.server = server;
        } else {
            this.server = siteRoot;
        }

        this.req = axios.create({
            headers: {
                'X-CSRFToken': xcsrfHeaders,
            }
        });
        return this;
    }

    _sendPostRequest(url, form) {
        if (form.getHeaders) {
            return this.req.post(url, form, {
                headers: form.getHeaders()
            });
        } else {
            return this.req.post(url, form);
        }
    }

    listShareLinkAuthUsers(link_token) {
        const url = this.server + '/api/v2.1/share-links/' + link_token + '/user-auth/';
        return this.req.get(url);
    }

    addShareLinkAuthUsers(link_token, emails, path) {
        const url = this.server + '/api/v2.1/share-links/' + link_token + '/user-auth/';
        const data = {
            emails: emails,
            path: path
        };
        return this.req.post(url, data);

    }

    deleteShareLinkAuthUsers(link_token, emails) {
        const url = this.server + '/api/v2.1/share-links/' + link_token + '/user-auth/';
        const params = {
            emails: emails
        };
        return this.req.delete(url, {data: params});
    }


    createShareLink(repoID, path, password, expirationTime, permissions, scope, users) {
        const url = this.server + '/api/v2.1/share-links/';
        let form = {
            'path': path,
            'repo_id': repoID,
            'user_scope': scope,
        };
        if (permissions) {
          form['permissions'] = permissions;
        }
        if (password) {
          form['password'] = password;
        }
        if (expirationTime) {
          form['expiration_time'] = expirationTime;
        }
        if (users) {
          form['emails'] = users;
        }
        return this._sendPostRequest(url, form);
    }

    updateShareLinkScope(token, scope) {
        var url = this.server + '/api/v2.1/share-links/' + token + '/';
        let form = {'user_scope': scope};

        return this.req.put(url, form);
    }

    listExRepos() {
        let url = this.server + '/api/v2.1/repos/?type=external';
        return this.req.get(url);
    }

    createRepo(repo, is_external=false) {
        let url = this.server + '/api2/repos/?from=web';
        if (is_external) {
            url = url + '&is_external=true'
        }
        return this.req.post(url, repo);
    }

    sendUploadLink(token, email, extraMsg, isExternal) {
        let url;
        if (isExternal) {
            url = this.server + '/api2/send-ex-upload-link/'
        } else {
            url = this.server + '/api2/send-upload-link/';
        }

        let form = new FormData();
        form.append('token', token);
        form.append('email', email);
        if (extraMsg) {
          form.append('extra_msg', extraMsg);
        }
        return this._sendPostRequest(url, form);
  }

}

let customAPI = new CustomAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
customAPI.initForSeahubUsage({siteRoot, xcsrfHeaders});
export { customAPI };
