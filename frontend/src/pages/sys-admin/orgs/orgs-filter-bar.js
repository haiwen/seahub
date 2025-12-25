import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import Selector from '../../../components/single-selector';

import './orgs-filter-bar.css';

class OrgsFilterBar extends Component {

  selectStatusOption = (option) => {
    this.props.onStatusChange(option.value);
  };

  render() {
    const { isActive } = this.props;

    this.statusOptions = [
      { value: '', text: gettext('All') },
      { value: '1', text: gettext('Active') },
      { value: '0', text: gettext('Inactive') }
    ].map(item => {
      item.isSelected = isActive == item.value;
      return item;
    });
    const currentSelectedStatusOption = this.statusOptions.filter(item => item.isSelected)[0];

    return (
      <div className="orgs-filter-bar mt-4 mb-2 d-flex align-items-center">
        <span className="filter-item mr-2">{`${gettext('Status')}:`}</span>
        <Selector
          isDropdownToggleShown={true}
          currentSelectedOption={currentSelectedStatusOption}
          options={this.statusOptions}
          selectOption={this.selectStatusOption}
        />
      </div>
    );
  }
}

OrgsFilterBar.propTypes = {
  onStatusChange: PropTypes.func,
  isActive: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default OrgsFilterBar;
