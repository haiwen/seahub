import { Utils } from '../../../utils/utils';

export const updateAppIcon = () => {
  const { docName } = window.app.pageOptions;
  const fileIcon = Utils.getFileIconUrl(docName);
  document.getElementById('favicon').href = fileIcon;
};
