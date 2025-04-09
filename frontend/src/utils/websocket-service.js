import { userAPI } from './user-api';
import { notificationServerUrl } from './constants';


class WebSocketClient {
  constructor(onMessageCallback, repoId) {
    this.url = notificationServerUrl; // WebSocket address;
    this.repoId = repoId;
    this.socket = null;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.onMessageCallback = onMessageCallback;
    if (notificationServerUrl !== '') {
      this.connect();
    }
  }

  async connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = async () => {
      const msg = await this.formatSubscriptionMsg();
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(msg), 'msg')
      this.socket.send(JSON.stringify(msg));
    };

    // listen message from WebSocket server
    this.socket.onmessage = async (event) => {
      const parsedData = JSON.parse(event.data);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(parsedData), 'parsedData')
      // jwt-expire reconnect
      if (parsedData.type === 'jwt-expired') {
        const msg = await this.formatSubscriptionMsg();
        this.socket.send(JSON.stringify(msg));
      } else {
        this.onMessageCallback(parsedData);
      }
    };

    this.socket.onerror = (error) => {
      return error;
    };

    // reconnect WebSocket
    this.socket.onclose = () => {
      if (this.shouldReconnect) {
        this.reconnect();
      }
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

  formatUnSubscriptionMsg() {
    const jsonData = {
      type: 'unsubscribe',
      content: {
        repos: [
          {
            id: this.repoId
          },
        ],
      },
    };
    return jsonData;
  }

  close() {
    this.shouldReconnect = false;
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        const msg = this.formatUnSubscriptionMsg();
        this.socket.send(JSON.stringify(msg));
      }
      this.socket.close();
      this.socket = null;
    }

  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}

export default WebSocketClient;
