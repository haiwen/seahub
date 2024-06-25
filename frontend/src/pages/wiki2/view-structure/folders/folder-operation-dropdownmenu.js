import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../../components/icon';

export default class FolderOperationDropdownMenu extends Component {

  static propTypes = {
    changeItemFreeze: PropTypes.func,
    openFolderEditor: PropTypes.func,
    onDeleteFolder: PropTypes.func,
    onToggleAddView: PropTypes.func,
    onToggleAddArchiveView: PropTypes.func,
    folderId: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.state = {
      isMenuShow: false,
    };
  }

  onDropdownToggle = (e) => {
    e.stopPropagation();
    const isMenuShow = !this.state.isMenuShow;
    this.props.changeItemFreeze(isMenuShow);
    this.setState({ isMenuShow });
  };

  openFolderEditor = (evt) => {
    evt.nativeEvent.stopImmediatePropagation();
    this.props.openFolderEditor();
  };

  onDeleteFolder = (evt) => {
    evt.nativeEvent.stopImmediatePropagation();
    this.props.onDeleteFolder(this.props.folderId);
  };

  render() {
    return (
      <>
        <Dropdown
          isOpen={this.state.isMenuShow}
          toggle={this.onDropdownToggle}
          className="more-view-folder-operation"
        >
          <DropdownToggle tag="span" data-toggle="dropdown" aria-expanded={this.state.isMenuShow}>
            <Icon symbol={'more-level'}/>
          </DropdownToggle>
          <DropdownMenu
            className="dtable-dropdown-menu large"
            flip={false}
            modifiers={{ preventOverflow: { boundariesElement: document.body } }}
            positionFixed={true}
          >
            <DropdownItem onClick={this.props.onToggleAddView.bind(this, this.props.folderId)}>
              <i className="sf3-font sf3-font-file" />
              <span className="item-text">{gettext('Add page')}</span>
            </DropdownItem>
            <DropdownItem onClick={this.openFolderEditor}>
              <i className="sf3-font sf3-font-rename" />
              <span className="item-text">{gettext('Modify name')}</span>
            </DropdownItem>
            <DropdownItem onMouseDown={this.onDeleteFolder}>
              <i className="sf3-font sf3-font-delete1" />
              <span className="item-text">{gettext('Delete folder')}</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </>
    );
  }
}
