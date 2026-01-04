import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext } from '../../../../utils/constants';

/**
 * Formatter for modifier (user) column
 * Displays user name with link to profile, or special text for unknown/merge commits
 */
const ModifierFormatter = ({ record }) => {
  if (!record) return null;

  const { email, name, second_parent_id } = record;

  // Handle different cases
  if (email) {
    if (!second_parent_id) {
      // Normal commit - link to user profile
      return (
        <a href={`${siteRoot}profile/${encodeURIComponent(email)}/`}>
          {name}
        </a>
      );
    } else {
      // Merge commit
      return gettext('None');
    }
  } else {
    // Unknown user
    return gettext('Unknown');
  }
};

ModifierFormatter.propTypes = {
  record: PropTypes.object,
};

export default ModifierFormatter;

