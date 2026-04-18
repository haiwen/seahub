import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import '../../css/repo-list-card.css';

const propTypes = {
  children: PropTypes.node.isRequired,
};

const RepoListCard = ({ children }) => {
  return (
    <div className="repo-list-card">
      <div className="repo-list-card-header">
        <span className="repo-list-col-name">{gettext('Name')}</span>
        <span className="repo-list-col-icon"></span>
        <span className="repo-list-col-actions"></span>
        <span className="repo-list-col-size">{gettext('Size')}</span>
        <span className="repo-list-col-time">{gettext('Last modified')}</span>
        <span className="repo-list-col-owner">{gettext('Owner')}</span>
      </div>
      <div className="repo-list-card-body">
        {children}
      </div>
    </div>
  );
};

RepoListCard.propTypes = propTypes;

export default RepoListCard;
