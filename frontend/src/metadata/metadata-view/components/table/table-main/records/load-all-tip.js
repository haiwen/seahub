import React from 'react';
import PropTypes from 'prop-types';
import { toaster } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../../../utils/constants';

class LoadAllTip extends React.Component {

  onClick = () => {
    toaster.closeAll();
    this.props.clickToLoadMore(100000);
  };

  render() {
    return (
      <div className="load-all-tip">
        <span>{gettext('Loaded 50,000 records.')}</span>
        <div className="load-all ml-2" onClick={this.onClick}>{gettext('Click to load more')}</div>
      </div>
    );
  }
}

LoadAllTip.propTypes = {
  clickToLoadMore: PropTypes.func
};

export default LoadAllTip;
