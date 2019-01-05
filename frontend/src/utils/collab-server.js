import io from 'socket.io-client';
import { name, username, contactEmail, seafileCollabServer } from './constants';

const socket = (seafileCollabServer !== '') ? io(seafileCollabServer) : undefined;

class CollabServer {

  watchRepo(repoID, fn) {
    if (!socket) {
      return;
    }
    socket.emit('repo_update', {
      request: 'watch_update',
      repo_id: repoID,
      user: {
        name: name,
        username: username,
        contact_email: contactEmail,
      },
    });
    socket.on('repo_update', fn);
  }

  unwatchRepo(repoID, fn) {
    if (!socket) {
      return;
    }
    socket.emit('repo_update', {
      request: 'unwatch_update',
      repo_id: repoID,
      user: {
        name: name,
        username: username,
        contact_email: contactEmail,
      },
    });
    socket.off('repo_update', fn);
  }
}

const collabServer = new CollabServer();

export default collabServer;
