import { userAPI } from '../utils/user-api';


class WebSocketService {
    constructor(url, onMessageCallback, repoId) {
      this.url = url;
      this.repoId = repoId
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
  
      // 监听来自 WebSocket 服务器的消息
      this.socket.onmessage = (event) => {
        const parsedData = JSON.parse(event.data);
        console.log('Received:', parsedData);
        if (this.onMessageCallback) {
            this.onMessageCallback(parsedData); // 调用传入的回调函数处理消息
          } else {
            this.handleMessage(parsedData); // 默认处理消息
          }
      };
  
      // 处理 WebSocket 错误
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
  
      // 处理 WebSocket 连接关闭
      this.socket.onclose = () => {
        console.log('WebSocket connection closed. Reconnecting...');
        this.cleanup();
        this.reconnect();
      };
    }

    async getRepoJwtToken() {
        const token = await userAPI.getNotificationToken(this.repoId).then(res => {
            return res.data.token;
        }).catch(err => {
            console.error('Failed to fetch JWT token:', err);
            throw err;
        });
        return token
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
      if (data.type === 'file-lock-changed') {
        console.log('Handling update:', data);
      } else {
        console.log('Handling other message:', data);
      }
    }
  
    cleanup() {
      clearInterval(this.heartbeatInterval);
    }
  
    reconnect() {
      setTimeout(() => {
        console.log('Reconnecting WebSocket...');
        this.connect(this.repoId);
      }, 5000);
    }
  }
  
export default WebSocketService;
