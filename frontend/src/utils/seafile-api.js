import cookie from 'react-cookies';
import { SeafileAPI } from '../seafile-api';
import { siteRoot } from './constants';

let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('sfcsrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export { seafileAPI };
