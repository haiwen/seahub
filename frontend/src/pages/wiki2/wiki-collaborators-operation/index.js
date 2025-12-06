import React from 'react';
import { EventBus, SocketManager, context } from '@seafile/sdoc-editor';
import CollaboratorsPopover from './collaborators-popover.js';
import { EXTERNAL_EVENT } from '@seafile/seafile-sdoc-editor';

import './index.css';

class CollaboratorsOperation extends React.PureComponent {

  constructor(props) {
    super(props);
    const userInfo = context.getUserInfo();
    this.currentUser = userInfo;
    this.state = {
      shownCollaborators: []
    }
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeTransferCollaborators = eventBus.subscribe(EXTERNAL_EVENT.TRANSFER_REALTIME_COLLABORATORS, this.getCollaborators);
    this.unsubscribeJoinEvent = eventBus.subscribe('join-room', this.onUserJoinRoom);
    this.unsubscribeLeaveEvent = eventBus.subscribe('leave-room', this.onUserLeaveRoom);
    this.unsubscribeUpdatedEvent = eventBus.subscribe('user-updated', this.onUserUpdated);
  }

  componentWillUnmount() {
    this.unsubscribeTransferCollaborators();
    this.unsubscribeJoinEvent();
    this.unsubscribeLeaveEvent();
    this.unsubscribeUpdatedEvent();
  }

  getCollaborators = (collaborators) => {
    const currentUserIndex = collaborators.findIndex(user => user.username === this.currentUser.username);
    if (currentUserIndex > -1) {
      collaborators.splice(currentUserIndex, 1);
    }
    collaborators.unshift(this.currentUser);

    this.setState(prevState => ({
      shownCollaborators: [...prevState.shownCollaborators, ...collaborators]
    }));
  };

  onUserJoinRoom = (userInfo) => {
    const { shownCollaborators } = this.state;
    let newCollaborators = shownCollaborators.slice();
    if (!newCollaborators.find(user => user.username === userInfo.username)) {
      newCollaborators.push(userInfo);
      this.setState({ shownCollaborators: newCollaborators});
    }
  };

  onUserLeaveRoom = (username) => {
    if (this.currentUser.username === username) return;
    const { shownCollaborators } = this.state;
    let newCollaborators = shownCollaborators.slice();
    if (newCollaborators.find(user => user.username === username)) {
      newCollaborators = newCollaborators.filter(user => user.username !== username);
      this.setState({ shownCollaborators: newCollaborators});
    }
  };

  onUserUpdated = (userInfo) => {
    const { shownCollaborators } = this.state;
    console.log(44, userInfo, shownCollaborators)
    const newCollaborators = shownCollaborators.map(item => {
      if (item.username === userInfo.username) {
        item.name = userInfo.name;
      }
      return item;
    });
    this.setState({ shownCollaborators: newCollaborators});
  };

  onRename = (newName) => {
    const { shownCollaborators } = this.state;
    const currentUser = this.currentUser;
    const socketManager = SocketManager.getInstance();
    socketManager.sendUserUpdated(newName);
    const newCollaborators = shownCollaborators.map(item => {
      if (item.username === currentUser.username) {
        item.name = newName;
        this.currentUser.name = newName;
      }
      return item;
    });
    this.setState({ shownCollaborators: newCollaborators});
  };

  render() {
    const { shownCollaborators } = this.state;

    return (
      <>
        <span className='wiki-collaborators-btn-container' id="collaborators">
          <i className='sdocfont sdoc-user mr-1'></i>
          {shownCollaborators.length}
        </span>
        <CollaboratorsPopover collaborators={shownCollaborators} />
      </>
    );
  }
}

export default CollaboratorsOperation;
