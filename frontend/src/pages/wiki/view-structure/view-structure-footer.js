import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CommonAddTool from '../../../components/common/common-add-tool';
import AddViewDropdownMenu from './add-view-dropdownmenu';
import { gettext } from '../../../utils/constants';

class ViewStructureFooter extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowAddViewDropdownMenu: false,
      isAddToolHover: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ isAddToolHover: true });
  };

  onMouseLeave = () => {
    this.setState({ isAddToolHover: false });
  };

  onToggleAddViewDropdown = (event) => {
    event && event.stopPropagation();
    this.setState({ isShowAddViewDropdownMenu: !this.state.isShowAddViewDropdownMenu });
  };

  render() {
    return (
      <div
        className='view-structure-footer'
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        ref={ref => this.viewFooterRef = ref}
      >
        <div className='add-view-wrapper'>
          <CommonAddTool
            className='add-view-btn'
            callBack={this.onToggleAddViewDropdown}
            footerName={gettext('Add page or folder')}
          />
          {this.state.isShowAddViewDropdownMenu &&
            <AddViewDropdownMenu
              onToggleAddViewDropdown={this.onToggleAddViewDropdown}
              onToggleAddView={this.props.onToggleAddView}
              onToggleAddFolder={this.props.onToggleAddFolder}
            />
          }
        </div>
      </div>
    );
  }
}

ViewStructureFooter.propTypes = {
  onToggleAddView: PropTypes.func,
  onToggleAddFolder: PropTypes.func,
};

export default ViewStructureFooter;
