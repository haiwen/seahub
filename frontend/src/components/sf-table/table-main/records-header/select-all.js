import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../icon';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';

class SelectAll extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isSelectedAll: props.isSelectedAll,
    };
  }

  componentDidUpdate(prevProps) {
    const { isSelectedAll } = this.props;
    if (isSelectedAll !== prevProps.isSelectedAll) {
      this.setState({
        isSelectedAll,
      });
    }
  }

  onToggleSelectAll = (e) => {
    const { isMobile, hasSelectedRecord } = this.props;
    const { isSelectedAll } = this.state;
    if (isMobile) {
      e.preventDefault();
    }
    if (hasSelectedRecord || isSelectedAll) {
      this.setState({ isSelectedAll: false });
      this.props.selectNoneRecords();
      return;
    }
    this.setState({ isSelectedAll: true });
    this.props.selectAllRecords();
  };

  render() {
    const { isMobile, hasSelectedRecord } = this.props;
    const { isSelectedAll } = this.state;
    const isSelectedParts = hasSelectedRecord && !isSelectedAll;
    return (
      <div
        className="select-all-checkbox-container"
        onClick={this.onToggleSelectAll}
        role="button"
        tabIndex={0}
        onKeyDown={Utils.onKeyDown}
        aria-label={gettext('Select all')}
      >
        {isMobile ?
          <label className='mobile-select-all-container'>
            {isSelectedParts ?
              (<Icon symbol="partially-selected" />) :
              (
                <>
                  <input
                    className="mobile-select-all-checkbox form-check-input"
                    name="mobile-select-all-checkbox"
                    type="checkbox"
                    checked={isSelectedAll}
                    readOnly
                  />
                  <div className='select-all-checkbox-show'></div>
                </>
              )
            }
          </label> :
          <>
            {isSelectedParts ?
              (<Icon symbol="partially-selected" />) :
              (
                <input
                  id="select-all-checkbox"
                  className="select-all-checkbox form-check-input"
                  type="checkbox"
                  name={gettext('Select all')}
                  title={gettext('Select all')}
                  aria-label={gettext('Select all')}
                  checked={isSelectedAll}
                  readOnly
                />
              )
            }
          </>
        }
        <label
          htmlFor="select-all-checkbox"
          name={gettext('Select all')}
          title={gettext('Select all')}
          aria-label={gettext('Select all')}
        >
        </label>
      </div>
    );
  }
}

SelectAll.propTypes = {
  isMobile: PropTypes.bool,
  hasSelectedRecord: PropTypes.bool,
  isSelectedAll: PropTypes.bool,
  selectNoneRecords: PropTypes.func,
  selectAllRecords: PropTypes.func,
};

export default SelectAll;
