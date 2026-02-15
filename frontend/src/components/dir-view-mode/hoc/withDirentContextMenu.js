import React from 'react';
import { getDirentItemMenuList, getBatchMenuList, getPermissions } from '../utils/contextMenuUtils';

export const withDirentContextMenu = (WrappedComponent) => {
  return class extends React.Component {
    getItemMenuList = (dirent, isContextmenu = true) => {
      return getDirentItemMenuList(this.props.currentRepoInfo, dirent, isContextmenu);
    };

    getBatchMenuList = (selectedDirents) => {
      return getBatchMenuList(this.props.currentRepoInfo, selectedDirents, this.getItemMenuList);
    };

    get permissions() {
      return getPermissions(this.props.currentRepoInfo);
    }

    render() {
      return (
        <WrappedComponent
          {...this.props}
          getItemMenuList={this.getItemMenuList}
          getBatchMenuList={this.getBatchMenuList}
          permissions={this.permissions}
        />
      );
    }
  };
};
