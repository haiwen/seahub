import React from 'react';
import { getDirentItemMenuList, getBatchMenuList } from '../utils/contextMenuUtils';

export const withDirentContextMenu = (WrappedComponent) => {
  return class extends React.Component {
    getItemMenuList = (dirent, isContextmenu = true) => {
      return getDirentItemMenuList(this.props.currentRepoInfo, dirent, isContextmenu);
    };

    getBatchMenuList = (selectedDirents) => {
      return getBatchMenuList(this.props.currentRepoInfo, selectedDirents, this.getItemMenuList);
    };

    render() {
      return (
        <WrappedComponent
          {...this.props}
          getItemMenuList={this.getItemMenuList}
          getBatchMenuList={this.getBatchMenuList}
        />
      );
    }
  };
};
