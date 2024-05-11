import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CommonAddTool from '../../../components/common/common-add-tool';
import AddViewDropdownMenu from './add-view-dropdownmenu';
import { gettext } from '../../../utils/constants';

class ViewStructureFooter extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowDropdownMenu: false,
    };
  }

  toggleDropdown = (event) => {
    event && event.stopPropagation();
    this.setState({ isShowDropdownMenu: !this.state.isShowDropdownMenu });
  };

  render() {
    return (
      <div className='view-structure-footer'>
        <div className='add-view-wrapper'>
          <CommonAddTool
            className='add-view-btn'
            callBack={this.toggleDropdown}
            footerName={gettext('Add page or folder')}
          />
          {this.state.isShowDropdownMenu &&
            <AddViewDropdownMenu
              toggleDropdown={this.toggleDropdown}
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
