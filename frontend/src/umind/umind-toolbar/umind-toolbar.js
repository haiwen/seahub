import React, { Fragment } from 'react';
import { Tooltip, Divider, Icon } from 'antd';
import { Toolbar, Command } from 'gg-editor';
import withGGEditorContext from 'gg-editor/es/common/context/GGEditorContext/withGGEditorContext';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

import './toolbar.css';

const { repoID, filePath, fileName } = window.app.pageOptions;
class UMindToolbar extends React.Component {

  onSaveClick = (e) => {
    e.preventDefault();
    let { editor } = this.props;
    let page = editor.getCurrentPage();
    let { data } = page._cfg;
    let dirPath = Utils.getDirName(filePath);
    seafileAPI.getUpdateLink(repoID, dirPath).then(res => {
      let updateLink = res.data;
      let updateData = JSON.stringify(data);
      seafileAPI.updateFile(updateLink, filePath, fileName, updateData).then(res => {
        toaster.success(gettext('File saved.'));
      }).catch(() => {
        toaster.success(gettext('File save failed.'));
      });
    })
  }

  render() {
    return (
      <Fragment>
        <div className="custom-toolbar" onClick={this.onSaveClick}>
          <Tooltip title="保存" placement="bottom" overlayClassName="tooltip">
            <Icon type="save" />
          </Tooltip>
        </div>
        <Toolbar className="common-toolbar">
          <Divider type="vertical" />
          <Command name="undo">
            <Tooltip title="撤销" placement="bottom" overlayClassName="tooltip">
              <i className="iconfont icon-undo" />
            </Tooltip>
          </Command>
          <Command name="redo">
            <Tooltip title="重做" placement="bottom" overlayClassName="tooltip">
              <i className="iconfont icon-redo" />
            </Tooltip>
          </Command>
          <Divider type="vertical" />
          <Command name="zoomIn">
            <Tooltip title="放大" placement="bottom" overlayClassName="tooltip">
              <i className="iconfont icon-zoom-in-o" />
            </Tooltip>
          </Command>
          <Command name="zoomOut">
            <Tooltip title="缩小" placement="bottom" overlayClassName="tooltip">
              <i className="iconfont icon-zoom-out-o" />
            </Tooltip>
          </Command>
          <Command name="autoZoom">
            <Tooltip title="适应画布" placement="bottom" overlayClassName="tooltip">
              <i className="iconfont icon-fit" />
            </Tooltip>
          </Command>
          <Command name="resetZoom">
            <Tooltip title="实际尺寸" placement="bottom" overlayClassName="tooltip">
              <i className="iconfont icon-actual-size-o" />
            </Tooltip>
          </Command>
          <Divider type="vertical" />
          <Command name="append">
            <Tooltip title="插入同级" placement="bottom" overlayClassName="tooltip">
              <i className="bi-icon icon-insert-sibling" />
            </Tooltip>
          </Command>
          <Command name="appendChild">
            <Tooltip title="插入子级" placement="bottom" overlayClassName="tooltip">
              <i className="bi-icon icon-insert-child" />
            </Tooltip>
          </Command>
          <Divider type="vertical" />
          <Command name="collapse">
            <Tooltip title="折叠" placement="bottom" overlayClassName="tooltip">
              <i className="bi-icon icon-collapse-subtree" />
            </Tooltip>
          </Command>
          <Command name="expand">
            <Tooltip title="展开" placement="bottom" overlayClassName="tooltip">
              <i className="bi-icon icon-expand-subtree" />
            </Tooltip>
          </Command>
        </Toolbar>
      </Fragment>
    );
  }
}

export default withGGEditorContext(UMindToolbar);
