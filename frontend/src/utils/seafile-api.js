import cookie from 'react-cookies';
import { SeafileAPI } from 'seafile-js';
import { siteRoot } from './constants';

let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { seafileAPI };
