import { userAPI } from '../utils/user-api';


class WebSocketService {
    constructor(url, onMessageCallback) {
      this.url = url;
      this.socket = null;
      this.heartbeatInterval = null; // 用于心跳机制
      this.onMessageCallback = onMessageCallback; // 用于接收外部的消息处理回调函数
      this.initConnect(); // 确保构造函数内调用
    }
  
    // 初始化 WebSocket 连接
    async connect(repoId) {
      this.socket = new WebSocket(this.url);
  
      // 当 WebSocket 连接成功时触发
      this.socket.onopen = async () => {
        console.log('WebSocket connection established.');
        // 获取并发送订阅消息
        const msg = await this.formatSubscriptionMsg(repoId);
        console.log('Sent subscription message:', msg);
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
        this.handleMessage(parsedData);
      };
  
      // 处理 WebSocket 错误
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
  
      // 处理 WebSocket 连接关闭
      this.socket.onclose = () => {
        console.log('WebSocket connection closed. Reconnecting...');
        this.cleanup();
        this.reconnect(repoId);
      };
    }
  
    // 获取 repo 的 JWT 令牌
    // async getRepoJwtToken(repoId) {
    //     await userAPI.getNotificationToken(repoId).then(res => {
    //         return res.data.token;
    //     }).catch(err => {
    //         console.error('Failed to fetch JWT token:', err);
    //         throw err;
    //     });
    // }

    getRepoJwtToken = async (repoId) => {
        await userAPI.getNotificationToken(repoId).then(res => {
            return res.data.token;
        }).catch(err => {
            console.error('Failed to fetch JWT token:', err);
            throw err;
        });
    } 
  
    // 格式化订阅消息
    async formatSubscriptionMsg(repoId) {
      let repoToken = await this.getRepoJwtToken(repoId);
      repoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IjY5NjQzNzI5ZmNiOTQ5N2Q4ZGFhMjgxNWQwMTU4OTY3QGF1dGgubG9jYWwiLCJyZXBvX2lkIjoiNmU1NGE5ZjAtOGM4NS00MzFhLWIyYjQtYWY0N2EyN2MwMzhlIiwiZXhwIjoxNzI3ODM1NjMyfQ.r2NoD5dHrC1a6X5EUfUBz1V-vMHVyflwyyNtS-ltejM'
      repoId = '6e54a9f0-8c85-431a-b2b4-af47a27c038e'
      console.log(111)
      const jsonData = {
        type: 'subscribe',
        content: {
          repos: [
            {
              id: repoId,
              jwt_token: repoToken,
            },
          ],
        },
      };
      return jsonData;
    }
  
    // 处理接收到的 WebSocket 消息
    handleMessage(data) {
      // 根据不同的消息类型处理不同的逻辑
      if (data.type === 'file-lock-changed') {
        console.log('Handling update:', data);
        // 判断当前是否在该页面中，若在，则更新dirent，若不在，则不处理
      } else {
        console.log('Handling other message:', data);
      }
    }
  
    // 关闭连接时清理资源
    cleanup() {
      clearInterval(this.heartbeatInterval);
    }
  
    // 重连逻辑
    reconnect(repoId) {
      setTimeout(() => {
        console.log('Reconnecting WebSocket...');
        this.connect(repoId);
      }, 5000); // 等待 5 秒后重新连接
    }
  
    // 初始化连接的逻辑
    initConnect() {
      const repoId = '6e54a9f0-8c85-431a-b2b4-af47a27c038e'; // 假设这是一个硬编码的 repoId
      this.connect(repoId); // 调用 connect 方法进行连接
    }
  }
  
export default WebSocketService;
