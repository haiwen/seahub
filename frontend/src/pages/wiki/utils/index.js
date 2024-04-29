import {serviceURL} from '../../../utils/constants';

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

const PAGE_ICON_LIST = [
  'app-table',
  'app-form',
  'app-gallery',
  'app-map',
  'app-information',
  'app-inquire',
  'app-label',
  'app-matter',
  'app-design',
  'app-statistics',
  'app-link',
  'app-external-links',
  'app-page',
  'app-home',
  'app-personnel',
  'app-star-mark',
  'app-history',
  'app-edit',
  'app-folder',
  'app-calendar',
  'app-invoice',
  'app-contract',
  'app-email',
  'app-logistics',
  'app-product-library',
  'app-purchase',
  'app-distribution',
  'app-achievement-distribution',
  'app-address-book',
  'app-individual-bill',
  'app-post-sale',
  'app-rules-and-regulations'
];

const getIconURL = (repoId, fileName) => {
  return serviceURL + '/lib/' + repoId + '/file/_Internal/Wiki/Icon/' + fileName + '?raw=1';
};

export { generatorBase64Code, generateUniqueId, isObjectNotEmpty, PAGE_ICON_LIST, getIconURL };
