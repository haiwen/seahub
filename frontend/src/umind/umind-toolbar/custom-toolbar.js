import React from 'react';
import PropTypes from 'prop-types';
import withGGEditorContext from 'gg-editor/es/common/context/GGEditorContext/withGGEditorContext';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { gettext } from '../../utils/constants';

const propTypes = {
};

const { repoID, filePath, fileName } = window.app.pageOptions;

class CustomToolbar extends React.Component {

  onSaveClick = () => {
    let { editor } = this.props;
    let page = editor.getCurrentPage();
    let { data } = page._cfg;
    let dirPath = Utils.getDirName(filePath);
    seafileAPI.getUpdateLink(repoID, dirPath).then(res => {
      let updateLink = res.data;
      let updateData = JSON.stringify(data);
      seafileAPI.updateFile(updateLink, filePath, fileName, updateData).then(res => {
        console.log(res);
        toaster.success(gettext('saved file success.'));
      }).catch(() => {
        toaster.success(gettext('saved file failed.'));
      });
    })
  }

  render() {
    return (
      <div className="umind-custom-toolbar">
        <div onClick={this.onSaveClick}>保存</div>
      </div>
    );
  }
}

CustomToolbar.propTypes = propTypes;

export default withGGEditorContext(CustomToolbar);
