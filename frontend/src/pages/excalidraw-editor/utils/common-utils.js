import context from '../context';

export const getErrorMsg = (error) => {
  let errorMsg = '';
  if (error.response) {
    if (error.response.status === 403) {
      errorMsg = 'Permission_denied';
    } else if (error.response.data &&
      error.response.data['error_msg']) {
      errorMsg = error.response.data['error_msg'];
    } else {
      errorMsg = 'Error';
    }
  } else {
    errorMsg = 'Please_check_the_network';
  }
  return errorMsg;
};

export const formatImageUrlFromExternalLink = (imageUrl, sharedToken) => {
  let newImageUrl = imageUrl;
  const serviceURL = context.getSetting('serviceURL');
  const repoID = context.getSetting('repoID');
  const re = new RegExp(serviceURL + '/lib/' + repoID + '/file.*raw=1');
  if (re.test(newImageUrl)) {
    // get image path
    let index = newImageUrl.indexOf('/file');
    let index2 = newImageUrl.indexOf('?');
    newImageUrl = newImageUrl.substring(index + 5, index2);
  }
  newImageUrl = serviceURL + '/view-image-via-share-link/?token=' + sharedToken + '&path=' + newImageUrl;
  return newImageUrl;
};
