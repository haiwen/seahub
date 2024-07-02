import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CommonAddTool from '../../../components/common/common-add-tool';
import AddPageDropdownMenu from './add-page-dropdownmenu';
import { gettext } from '../../../utils/constants';

class WikiNavFooter extends Component {

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
      <div className='wiki-nav-footer'>
        <div className='add-wiki-page-wrapper'>
          <CommonAddTool
            className='add-wiki-page-btn'
            callBack={this.toggleDropdown}
            footerName={gettext('Add page or folder')}
          />
          {this.state.isShowDropdownMenu &&
            <AddPageDropdownMenu
              toggleDropdown={this.toggleDropdown}
              onToggleAddPage={this.props.onToggleAddPage}
              onToggleAddFolder={this.props.onToggleAddFolder}
            />
          }
        </div>
      </div>
    );
  }
}

WikiNavFooter.propTypes = {
  onToggleAddPage: PropTypes.func,
  onToggleAddFolder: PropTypes.func,
};

export default WikiNavFooter;
