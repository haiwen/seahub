import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Icon from '../../components/icon';
import CustomDropdown from '../../components/dropdown';

const propTypes = {
  userPerm: PropTypes.string.isRequired,
  openFileInput: PropTypes.func.isRequired
};

class LastPathItemWrapper extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { userPerm } = this.props;
    let dropdownMenu = null;
    if (userPerm == 'rw') {
      const items = [
        {
          key: 'upload',
          label: gettext('Upload'),
          icon_dom: <Icon symbol="upload-files" className="mr-2 dropdown-item-icon" />,
          onClick: this.props.openFileInput
        }
      ];

      dropdownMenu = (
        <CustomDropdown
          items={items}
          trigger={(
            <>
              <Icon symbol="new" />
              <Icon symbol="down" className="path-item-dropdown-toggle" />
            </>
          )}
          triggerClassName="path-item"
          menuClassName="position-fixed"
          menuPortal={false}
        />
      );
    }

    return (
      <div className="dir-operation">
        <div id="dir-operation">
          {dropdownMenu}
        </div>
      </div>
    );
  }
}

LastPathItemWrapper.propTypes = propTypes;

export default LastPathItemWrapper;
