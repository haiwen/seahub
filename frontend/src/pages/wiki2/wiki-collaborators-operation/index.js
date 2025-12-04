import React from 'react';
import { EventBus, SocketManager, context } from '@seafile/sdoc-editor';
import CollaboratorsPopover from './collaborators-popover.js';

import './index.css';

class CollaboratorsOperation extends React.PureComponent {

  constructor(props) {
    super(props);
    const userInfo = context.getUserInfo();
    this.currentUser = userInfo;
  }

  componentDidMount() {
    const { collaborators, setCollaborators } = this.props;
    // delete current user and push it at first one
    const currentUserIndex = collaborators.findIndex(user => user.username === this.currentUser.username);
    if (currentUserIndex > -1) {
      collaborators.splice(currentUserIndex, 1);
    }
    collaborators.unshift(this.currentUser);
    setCollaborators(collaborators);

    const eventBus = EventBus.getInstance();
    this.unsubscribeJoinEvent = eventBus.subscribe('join-room', this.onUserJoinRoom);
    this.unsubscribeLeaveEvent = eventBus.subscribe('leave-room', this.onUserLeaveRoom);
    this.unsubscribeUpdatedEvent = eventBus.subscribe('user-updated', this.onUserUpdated);
  }

  componentWillUnmount() {
    this.unsubscribeJoinEvent();
    this.unsubscribeLeaveEvent();
    this.unsubscribeUpdatedEvent();
  }

  onUserJoinRoom = (userInfo) => {
    const { collaborators, setCollaborators } = this.props;
    let newCollaborators = collaborators.slice();
    if (!newCollaborators.find(user => user.username === userInfo.username)) {
      newCollaborators.push(userInfo);
      setCollaborators(newCollaborators);
    }
  };

  onUserLeaveRoom = (username) => {
    if (this.currentUser.username === username) return;
    const { collaborators, setCollaborators } = this.props;
    let newCollaborators = collaborators.slice();
    if (newCollaborators.find(user => user.username === username)) {
      newCollaborators = newCollaborators.filter(user => user.username !== username);
      setCollaborators(newCollaborators);
    }
  };

  onUserUpdated = (userInfo) => {
    const { collaborators, setCollaborators } = this.props;
    const newCollaborators = collaborators.map(item => {
      if (item.username === userInfo.username) {
        item.name = userInfo.name;
      }
      return item;
    });
    setCollaborators(newCollaborators);
  };

  onRename = (newName) => {
    const { collaborators, setCollaborators } = this.props;
    const currentUser = this.currentUser;
    const socketManager = SocketManager.getInstance();
    socketManager.sendUserUpdated(newName);
    const newCollaborators = collaborators.map(item => {
      if (item.username === currentUser.username) {
        item.name = newName;
        this.currentUser.name = newName;
      }
      return item;
    });
    setCollaborators(newCollaborators);
  };

  render() {
    const { collaborators } = this.props;

    return (
      <>
        <span className='wiki-collaborators-btn-container' id="collaborators">
          <i className='sdocfont sdoc-user mr-1'></i>
          {collaborators.length}
        </span>
        <CollaboratorsPopover collaborators={collaborators} />
      </>
    );
  }
}

export default CollaboratorsOperation;
