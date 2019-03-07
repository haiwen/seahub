import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import toaster from './components/toast';

window.seafileAPI = seafileAPI;
window.utils = Utils;
window.toaster =toaster;