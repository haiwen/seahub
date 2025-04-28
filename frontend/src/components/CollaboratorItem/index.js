import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext, enableShowContactEmailWhenSearchUser, enableShowLoginIDWhenSearchUser } from '../../utils/constants';

import './index.css';

const propTypes = {
  collaborator: PropTypes.shape({
    name: PropTypes.string.isRequired,
    avatar_url: PropTypes.string.isRequired,
    email: PropTypes.string,
    contact_email: PropTypes.string,
    login_id: PropTypes.string,
  }),
  className: PropTypes.string,
  enableDeleteCollaborator: PropTypes.bool,
  onDeleteCollaborator: PropTypes.func,
};

class CollaboratorItem extends React.Component {

  onDeleteCollaborator = (event) => {
    event.stopPropagation();
    event && event.nativeEvent.stopImmediatePropagation();
    this.props.onDeleteCollaborator(this.props.collaborator);
  };

  render() {
    const { className, collaborator, enableDeleteCollaborator } = this.props;
    return (
      <div className={classnames('collaborator-item', className)} title={collaborator.name}>
        <span className="collaborator-avatar">
          <img className="collaborator-avatar-icon" alt={collaborator.name} src={collaborator.avatar_url} />
        </span>
        <div className="d-flex align-items-center">
          <span className="collaborator-name">{collaborator.name}</span>
          {(enableShowContactEmailWhenSearchUser && !enableDeleteCollaborator) && <span className="user-option-email">({collaborator.contact_email})</span>}
          {(enableShowLoginIDWhenSearchUser && !enableDeleteCollaborator) && <span className="user-option-email">({collaborator.login_id})</span>}
        </div>
        {enableDeleteCollaborator && (
          <span className="collaborator-remove ml-2" onClick={this.onDeleteCollaborator} title={gettext('Remove')}>
            <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
          </span>
        )}
      </div>
    );
  }
}

CollaboratorItem.propTypes = propTypes;

export default CollaboratorItem;
