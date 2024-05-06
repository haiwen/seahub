import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
// import DeleteTip from '@/common/delete-tip';
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
      showTip: false,
    };
    // this.isDesktop = checkDesktop();
    this.position = {};
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

  // onClickDelete = (e) => {
  //   if (this.isDesktop) {
  //     e.stopPropagation();
  //     const { top, left } = this.iconRef.getBoundingClientRect();
  //     this.position = {
  //       top: top,
  //       left: left,
  //     };
  //     setTimeout(() => {
  //       this.setState({ showTip: true });
  //     }, 100);
  //   } else {
  //     this.onDeleteFolder(e);
  //   }
  // };

  closeTip = () => {
    this.setState({ showTip: false });
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
            style={{ zIndex: 1051 }}
          >
            <DropdownItem onClick={this.props.onToggleAddView.bind(this, this.props.folderId)}>
              <Icon symbol={'main-view'}/>
              <span className="item-text">{gettext('Add page')}</span>
            </DropdownItem>
            <DropdownItem onClick={this.openFolderEditor}>
              <Icon symbol={'edit'}/>
              <span className="item-text">{gettext('Modify name')}</span>
            </DropdownItem>
            <DropdownItem
              // onMouseDown={this.onClickDelete}
              onMouseDown={this.onDeleteFolder}
            >
              <Icon symbol={'delete'}/>
              <span className="item-text">{gettext('Delete folder')}</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        {/* {this.isDesktop && this.state.showTip &&
          <DeleteTip
            position={this.position}
            toggle={this.closeTip}
            onDelete={this.onDeleteFolder}
            deleteTip={gettext('Are_you_sure_you_want_to_delete_this_folder_and_the_pages_in_it')}
          />
        } */}
      </>
    );
  }
}
