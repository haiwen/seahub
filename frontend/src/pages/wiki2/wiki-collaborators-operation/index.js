import React from 'react';
import { EventBus, SocketManager, context } from '@seafile/sdoc-editor';
import CollaboratorsPopover from './collaborators-popover.js';
import Icon from '../../../components/icon.js';
import SDocServerApi from '../../../utils/sdoc-server-api.js';

import './index.css';

const sdocServer = window.wiki.config.seadocServerUrl;

class CollaboratorsOperation extends React.PureComponent {

  constructor(props) {
    super(props);
    const userInfo = context.getUserInfo();
    this.currentUser = userInfo;
    this.state = {
      shownCollaborators: []
    };
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeJoinEvent = eventBus.subscribe('join-room', this.onUserJoinRoom);
    this.unsubscribeLeaveEvent = eventBus.subscribe('leave-room', this.onUserLeaveRoom);
    this.unsubscribeUpdatedEvent = eventBus.subscribe('user-updated', this.onUserUpdated);
  }

  componentDidUpdate(prevProps) {
    const { token, docUuid, isOpenSocket } = this.props;
    if ((token !== prevProps.token || docUuid !== prevProps.docUuid) && isOpenSocket && token && docUuid) {
      const sdocServerApi = new SDocServerApi({ accessToken: token, docUuid, sdocServer });
      sdocServerApi.getCollaborator().then(res => {
        this.getCollaborators(res.data?.collaborators);
      });
    }
  }

  componentWillUnmount() {
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
    this.setState({ shownCollaborators: collaborators });
  };

  onUserJoinRoom = (userInfo) => {
    const { shownCollaborators } = this.state;
    let newCollaborators = shownCollaborators.slice();
    if (!newCollaborators.find(user => user.username === userInfo.username)) {
      newCollaborators.push(userInfo);
      this.setState({ shownCollaborators: newCollaborators });
    }
  };

  onUserLeaveRoom = (username) => {
    if (this.currentUser.username === username) return;
    const { shownCollaborators } = this.state;
    let newCollaborators = shownCollaborators.slice();
    if (newCollaborators.find(user => user.username === username)) {
      newCollaborators = newCollaborators.filter(user => user.username !== username);
      this.setState({ shownCollaborators: newCollaborators });
    }
  };

  onUserUpdated = (userInfo) => {
    const { shownCollaborators } = this.state;
    const newCollaborators = shownCollaborators.map(item => {
      if (item.username === userInfo.username) {
        item.name = userInfo.name;
      }
      return item;
    });
    this.setState({ shownCollaborators: newCollaborators });
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
    this.setState({ shownCollaborators: newCollaborators });
  };

  render() {
    const { shownCollaborators } = this.state;

    return (
      <>
        <span className='wiki-collaborators-btn-container' id="collaborators">
          <Icon symbol='sdoc-user' />
          {shownCollaborators.length}
        </span>
        <CollaboratorsPopover collaborators={shownCollaborators} />
      </>
    );
  }
}

export default CollaboratorsOperation;
