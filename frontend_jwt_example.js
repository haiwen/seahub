/**
 * 百度网盘模块前端JWT认证示例
 * 展示如何从Seahub获取JWT token并调用Go模块API
 */

class BaiduModuleAPI {
    constructor(options = {}) {
        this.seahubBaseURL = options.seahubBaseURL || '';
        this.moduleBaseURL = options.moduleBaseURL || 'http://localhost:9000';
        this.jwtToken = null;
        this.tokenExpiry = null;
    }

    /**
     * 从Seahub获取JWT Token
     */
    async getJWTToken() {
        try {
            const response = await fetch('/api/v2.1/baidu-module/jwt-token/', {
                method: 'POST',
                credentials: 'include', // 包含session cookie
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                },
            });

            if (!response.ok) {
                throw new Error(`获取JWT token失败: ${response.status}`);
            }

            const data = await response.json();
            this.jwtToken = data.token;
            this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
            
            console.log('JWT Token获取成功，有效期至:', this.tokenExpiry);
            return this.jwtToken;
        } catch (error) {
            console.error('获取JWT Token失败:', error);
            throw error;
        }
    }

    /**
     * 检查token是否有效
     */
    isTokenValid() {
        return this.jwtToken && this.tokenExpiry && new Date() < this.tokenExpiry;
    }

    /**
     * 确保有有效的JWT token
     */
    async ensureValidToken() {
        if (!this.isTokenValid()) {
            await this.getJWTToken();
        }
        return this.jwtToken;
    }

    /**
     * 获取CSRF Token
     */
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sfcsrftoken') {
                return value;
            }
        }
        return '';
    }

    /**
     * 调用Go模块API的通用方法
     */
    async callModuleAPI(endpoint, options = {}) {
        await this.ensureValidToken();
        
        const url = `${this.moduleBaseURL}${endpoint}`;
        const config = {
            headers: {
                'Authorization': `Bearer ${this.jwtToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API调用失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`调用API ${endpoint} 失败:`, error);
            throw error;
        }
    }

    /**
     * 获取用户信息
     */
    async getUserInfo() {
        return await this.callModuleAPI('/api/v1/user/info');
    }

    /**
     * 获取用户仓库列表
     */
    async getUserRepos() {
        return await this.callModuleAPI('/api/v1/user/repos');
    }

    /**
     * 检查仓库权限
     */
    async checkRepoPermission(repoId) {
        return await this.callModuleAPI(`/api/v1/repos/${repoId}/permission`);
    }

    /**
     * 百度网盘同步
     */
    async syncBaiduNetdisk(data) {
        return await this.callModuleAPI('/api/v1/baidu/sync', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

/**
 * React组件示例：百度网盘文件管理器
 */
class BaiduNetdiskManager extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            userInfo: null,
            repos: [],
            selectedRepo: null,
            error: null,
        };
        
        this.api = new BaiduModuleAPI();
    }

    async componentDidMount() {
        await this.loadInitialData();
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        this.setState({ loading: true, error: null });
        
        try {
            // 并行获取用户信息和仓库列表
            const [userInfo, reposData] = await Promise.all([
                this.api.getUserInfo(),
                this.api.getUserRepos(),
            ]);
            
            this.setState({
                userInfo,
                repos: reposData.repos || [],
                loading: false,
            });
        } catch (error) {
            this.setState({
                error: error.message,
                loading: false,
            });
        }
    }

    /**
     * 选择仓库
     */
    async selectRepo(repo) {
        this.setState({ loading: true });
        
        try {
            // 检查仓库权限
            const permissionData = await this.api.checkRepoPermission(repo.id);
            
            this.setState({
                selectedRepo: {
                    ...repo,
                    permission: permissionData.permission,
                },
                loading: false,
            });
        } catch (error) {
            this.setState({
                error: `无法访问仓库: ${error.message}`,
                loading: false,
            });
        }
    }

    /**
     * 同步百度网盘文件
     */
    async syncFiles(files) {
        if (!this.state.selectedRepo) {
            alert('请先选择一个仓库');
            return;
        }

        this.setState({ loading: true });
        
        try {
            const result = await this.api.syncBaiduNetdisk({
                repo_id: this.state.selectedRepo.id,
                files: files,
                action: 'copy_to_repo',
            });
            
            alert('文件同步成功!');
            this.setState({ loading: false });
        } catch (error) {
            this.setState({
                error: `同步失败: ${error.message}`,
                loading: false,
            });
        }
    }

    render() {
        const { loading, userInfo, repos, selectedRepo, error } = this.state;

        if (loading) {
            return <div className="loading">加载中...</div>;
        }

        return (
            <div className="baidu-netdisk-manager">
                <h2>百度网盘 - Seafile 同步</h2>
                
                {error && (
                    <div className="error-message">
                        错误: {error}
                        <button onClick={() => this.setState({ error: null })}>
                            关闭
                        </button>
                    </div>
                )}

                {userInfo && (
                    <div className="user-info">
                        <h3>用户信息</h3>
                        <p>用户名: {userInfo.username}</p>
                        <p>邮箱: {userInfo.email}</p>
                        <p>状态: {userInfo.is_active ? '活跃' : '非活跃'}</p>
                    </div>
                )}

                <div className="repo-selector">
                    <h3>选择目标仓库</h3>
                    <div className="repo-list">
                        {repos.map(repo => (
                            <div 
                                key={repo.id}
                                className={`repo-item ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
                                onClick={() => this.selectRepo(repo)}
                            >
                                <div className="repo-name">{repo.name}</div>
                                <div className="repo-info">
                                    <span className="repo-owner">拥有者: {repo.owner}</span>
                                    <span className="repo-type">类型: {repo.type}</span>
                                    <span className="repo-permission">权限: {repo.permission}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedRepo && (
                    <div className="selected-repo">
                        <h3>已选择仓库: {selectedRepo.name}</h3>
                        <p>权限: {selectedRepo.permission}</p>
                        
                        <div className="sync-actions">
                            <button 
                                onClick={() => this.syncFiles([
                                    { name: '示例文件.txt', path: '/示例文件.txt' }
                                ])}
                                disabled={selectedRepo.permission === 'r'}
                            >
                                同步示例文件
                            </button>
                            
                            {selectedRepo.permission === 'r' && (
                                <p className="permission-warning">
                                    只读权限，无法上传文件
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

/**
 * 使用示例
 */
async function example() {
    const api = new BaiduModuleAPI({
        moduleBaseURL: 'http://localhost:9000'
    });

    try {
        // 获取用户信息
        console.log('获取用户信息...');
        const userInfo = await api.getUserInfo();
        console.log('用户信息:', userInfo);

        // 获取仓库列表
        console.log('获取仓库列表...');
        const repos = await api.getUserRepos();
        console.log('仓库列表:', repos);

        // 检查特定仓库的权限
        if (repos.repos && repos.repos.length > 0) {
            const firstRepo = repos.repos[0];
            console.log('检查仓库权限:', firstRepo.id);
            const permission = await api.checkRepoPermission(firstRepo.id);
            console.log('权限信息:', permission);
        }

    } catch (error) {
        console.error('示例执行失败:', error);
    }
}

// CSS样式
const styles = `
.baidu-netdisk-manager {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.loading {
    text-align: center;
    padding: 50px;
    font-size: 18px;
}

.error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.user-info {
    background: #f9f9f9;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.repo-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
}

.repo-item {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.2s;
}

.repo-item:hover {
    border-color: #0969da;
    background: #f6f8fa;
}

.repo-item.selected {
    border-color: #0969da;
    background: #ddf4ff;
}

.repo-name {
    font-weight: bold;
    margin-bottom: 8px;
}

.repo-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #656d76;
}

.selected-repo {
    background: #e6f7ff;
    border: 1px solid #91caff;
    border-radius: 4px;
    padding: 20px;
    margin-top: 20px;
}

.sync-actions {
    margin-top: 15px;
}

.sync-actions button {
    background: #0969da;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}

.sync-actions button:disabled {
    background: #8c959f;
    cursor: not-allowed;
}

.permission-warning {
    color: #d1242f;
    font-size: 12px;
    margin-top: 8px;
}
`;

// 将样式添加到页面
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// 导出供使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaiduModuleAPI, BaiduNetdiskManager };
}
if (typeof window !== 'undefined') {
    window.BaiduModuleAPI = BaiduModuleAPI;
    window.BaiduNetdiskManager = BaiduNetdiskManager;
} 