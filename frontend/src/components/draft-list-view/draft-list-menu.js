import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  currentDraft: PropTypes.object.isRequired,
  isMenuShow: PropTypes.bool.isRequired,
  menuPosition: PropTypes.object.isRequired,
  onDeleteHandler: PropTypes.func.isRequired,
  onPublishHandler: PropTypes.func.isRequired,
  onReviewHandler: PropTypes.func.isRequired,
};

class DraftListMenu extends React.Component {

  render() {
    let style = {};
    let {isMenuShow, menuPosition, currentDraft} = this.props;
    if (isMenuShow) {
      style = {position: 'fixed', top: menuPosition.top, left: menuPosition.left, display: 'block'};
    }
    if (currentDraft.review_status === null) {
      return (
        <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.props.onDeleteHandler}>{gettext('Delete')}</li>
          {/* <li className="dropdown-item" onClick={this.props.onPublishHandler}>{gettext('Publish')}</li> */}
          <li className="dropdown-item" onClick={this.props.onReviewHandler}>{gettext('Ask for review')}</li>
        </ul>
      );
    }

    if (currentDraft.review_status === 'closed' ) {
      return (
        <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.props.onDeleteHandler}>{gettext('Delete')}</li>
          <li className="dropdown-item" onClick={this.props.onReviewHandler}>{gettext('Ask for review')}</li>
        </ul>
      );
    }
  }
}

DraftListMenu.propTypes = propTypes;

export default DraftListMenu;
