import { userAPI } from '../utils/user-api';


class WebSocketService {
  constructor(onMessageCallback, repoId) {

    this.url = 'ws://localhost:8083'; // WebSocket address;
    this.repoId = repoId;
    this.socket = null;
    this.heartbeatInterval = null;
    this.onMessageCallback = onMessageCallback;
    this.connect();
  }

  // init WebSocket connect
  async connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = async () => {
      const msg = await this.formatSubscriptionMsg();
      this.socket.send(JSON.stringify(msg));
    };

    // listen message from WebSocket server
    this.socket.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      this.handleMessage(parsedData); // default handle message
    };

    // handle WebSocket error
    this.socket.onerror = (error) => {
      throw error;
    };

    // reconnect WebSocket
    this.socket.onclose = () => {
      this.cleanup();
      this.reconnect();
    };
  }

  async getRepoJwtToken() {
    const response = await userAPI.getNotificationToken(this.repoId).then(res => {
      return res.data;
    }).catch(err => {
      throw err;
    });
    return response.token;
  }

  async formatSubscriptionMsg() {
    const repoToken = await this.getRepoJwtToken();
    const jsonData = {
      type: 'subscribe',
      content: {
        repos: [
          {
            id: this.repoId,
            jwt_token: repoToken,
          },
        ],
      },
    };
    return jsonData;
  }

  handleMessage(data) {
    switch (data.type) {
      case 'file-lock-changed':
        this.onMessageCallback(data); // Callback function to process message
        break;
      case 'folder-perm-changed':
        // Handle folder permission changed message
        break;
      case 'repo-update':
        // Handle repository update message
        break;
    }
  }

  cleanup() {
    clearInterval(this.heartbeatInterval);
  }

  reconnect() {
    setTimeout(() => {
      this.connect(this.repoId);
    }, 5000);
  }
}

export default WebSocketService;
