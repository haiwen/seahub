import {
  generatorBase64Code,
} from 'dtable-utils';

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

export { generateUniqueId };
