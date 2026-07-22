import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Dropdown, DropdownMenu, DropdownItem, DropdownToggle, Input, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../../../utils/constants';
import Icon from '../../../../icon';
import CommonOperationConfirmationDialog from '../../../../dialog/common-operation-confirmation-dialog';
import { useAskPage, useSessions } from '../../hooks';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import './index.css';

const Session = ({ session, isSelected, isTeamTab = false, embedded = false, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isShowRenameDialog, setIsShowRenameDialog] = useState(false);
  const [isShowDeleteDialog, setIsShowDeleteDialog] = useState(false);
  const [renameValue, setRenameValue] = useState(session.name);

  const { modifySession, deleteSession, shareSession, unshareSession } = useSessions();
  const { togglePageSlugId } = useAskPage();
  const displayName = session.problem || session.name;

  const toggleDropdown = useCallback((event) => {
    event && event.stopPropagation();
    setIsOpen((currentValue) => !currentValue);
  }, []);

  const onSelectSession = useCallback(() => {
    togglePageSlugId(session._id);
    onSelect && onSelect(session);
  }, [onSelect, session, togglePageSlugId]);

  const icon = session.is_shared ? 'group' : 'new-chat';

  if (isTeamTab) {
    return (
      <div
        className={classNames('sea-ai-ask-session-item', { active: isSelected, embedded })}
        onClick={onSelectSession}
      >
        <Icon symbol="group" className="mr-2" />
        <div className="sea-ai-ask-session-content">
          <div className="sea-ai-ask-session-name text-truncate" title={displayName}>{displayName}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={classNames('sea-ai-ask-session-item', 'has-more-menu', { active: isSelected || isOpen, embedded })}
        onClick={onSelectSession}
      >
        <Icon symbol={icon} className="mr-2" />
        <div className="sea-ai-ask-session-content">
          <div className="sea-ai-ask-session-name text-truncate" title={displayName}>{displayName}</div>
        </div>
        <Dropdown isOpen={isOpen} toggle={toggleDropdown} className="sea-ai-ask-session-more-op-btn">
          <DropdownToggle color="link" className="sea-ai-ask-session-more-op-btn p-0 border-0 text-secondary">
            <Icon symbol="more-level" />
          </DropdownToggle>
          <DropdownMenu end>
            <DropdownItem onClick={() => setIsShowRenameDialog(true)}>{gettext('Rename')}</DropdownItem>
            {session.is_shared ? (
              <DropdownItem onClick={() => unshareSession(session._id)}>{gettext('Unshare within library')}</DropdownItem>
            ) : (
              <DropdownItem onClick={() => shareSession(session._id)}>{gettext('Share within library')}</DropdownItem>
            )}
            <DropdownItem onClick={() => setIsShowDeleteDialog(true)}>{gettext('Delete')}</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      {isShowRenameDialog && (
        <Modal isOpen={true} toggle={() => setIsShowRenameDialog(false)} autoFocus={false}>
          <SeahubModalHeader toggle={() => setIsShowRenameDialog(false)}>
            {gettext('Chat name')}
          </SeahubModalHeader>
          <ModalBody>
            <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} autoFocus />
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setIsShowRenameDialog(false)}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={() => modifySession(session._id, { name: renameValue }).then(() => setIsShowRenameDialog(false))}>{gettext('Submit')}</Button>
          </ModalFooter>
        </Modal>
      )}
      {isShowDeleteDialog && (
        <CommonOperationConfirmationDialog
          title={gettext('Delete chat')}
          message={gettext('Are you sure you want to delete this chat?')}
          executeOperation={() => deleteSession(session._id)}
          confirmBtnText={gettext('Delete')}
          toggleDialog={() => setIsShowDeleteDialog(false)}
        />
      )}
    </>
  );
};

Session.propTypes = {
  session: PropTypes.object,
  isSelected: PropTypes.bool,
  isTeamTab: PropTypes.bool,
  embedded: PropTypes.bool,
  onSelect: PropTypes.func,
};

export default Session;
