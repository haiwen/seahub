import React from 'react';
import { UncontrolledPopover, PopoverBody, PopoverHeader } from 'reactstrap';
import { gettext } from '../../../utils/constants';

import './collaborators-popover.css';

const t = gettext;

class CollaboratorsPopover extends React.PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { collaborators } = this.props;

    return (
      <UncontrolledPopover
        target="collaborators"
        placement="bottom-end"
        popperClassName='collaborators-popover'
        trigger="legacy"
        hideArrow={true}
        fade={false}
        security='fixed'
      >
        <PopoverHeader className='popover-header'>{t('Online_members')}{' '}({collaborators.length})</PopoverHeader>
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
      </UncontrolledPopover>
    );
  }
}

export default CollaboratorsPopover;
