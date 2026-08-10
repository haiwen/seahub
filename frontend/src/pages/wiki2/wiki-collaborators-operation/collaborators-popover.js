import React from 'react';
import PropTypes from 'prop-types';
import { Popover, PopoverBody, PopoverHeader } from 'reactstrap';
import { gettext } from '../../../utils/constants';

import './collaborators-popover.css';

const t = gettext;

class CollaboratorsPopover extends React.PureComponent {
  render() {
    const { collaborators, isOpen, toggle } = this.props;

    return (
      <Popover
        isOpen={isOpen}
        toggle={toggle}
        target="collaborators"
        placement="bottom-end"
        popperClassName="collaborators-popover sf-popover-container"
        trigger="legacy"
        hideArrow={true}
        fade={false}
        security='fixed'
      >
        <PopoverHeader className='popover-header'>{t('Online members')}{' '}({collaborators.length})</PopoverHeader>
        <PopoverBody className="popover-container">
          <div className="content-list">
            {collaborators.map((item, index) => {
              const name = index === 0 ? `${item.name} (${t('Me')})` : item.name;
              return (
                <div key={index} className="collaborator-details">
                  <span className="collaborator-tag" />
                  <img className="collaborator-avatar" alt={name} src={item.avatar_url} />
                  <span className="collaborator-name">{name}</span>
                </div>
              );
            })}
          </div>
        </PopoverBody>
      </Popover>
    );
  }
}

CollaboratorsPopover.propTypes = {
  collaborators: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
};

export default CollaboratorsPopover;
