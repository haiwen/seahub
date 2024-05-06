import { serviceURL, mediaUrl } from '../../../utils/constants';

const generatorBase64Code = (keyLength = 4) => {
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < keyLength; i++) {
    key += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return key;
};

const generateUniqueId = (navigation, length = 4) => {
  let idMap = {};
  function recurseItem(item) {
    if (!item) return;
    idMap[item.id] = true;
    if (Array.isArray(item.children)) {
      item.children.forEach(item => {
        recurseItem(item);
      });
    }
  }
  navigation.forEach(item => recurseItem(item));

  let _id = generatorBase64Code(length);
  while (idMap[_id]) {
    _id = generatorBase64Code(length);
  }
  return _id;
};

const isObjectNotEmpty = (obj) => {
  return obj && Object.keys(obj).length > 0;
};

const getIconURL = (repoId, fileName) => {
  if (!fileName) {
    return null;
  }
  if (fileName === 'default') {
    return `${mediaUrl}img/wiki/default.png`;
  }
  return serviceURL + '/lib/' + repoId + '/file/_Internal/Wiki/Icon/' + fileName + '?raw=1';
};

export { generatorBase64Code, generateUniqueId, isObjectNotEmpty, getIconURL };
