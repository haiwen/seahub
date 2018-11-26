import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import CommonToolbar from './common-toolbar';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class GeneralToolbar extends React.Component {

  render() {
    let { onShowSidePanel, onSearchedClick } = this.props;
    let placeHolder = this.props.searchPlaceholder || 'Search files in this library';
    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span 
            className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" 
            title="Side Nav Menu" 
            onClick={onShowSidePanel}>
          </span>
        </div>
        <CommonToolbar 
          searchPlaceholder={placeHolder}
          onSearchedClick={onSearchedClick} 
        />
      </Fragment>
    );
  }
}

GeneralToolbar.propTypes = propTypes;

export default GeneralToolbar;
