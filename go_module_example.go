package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
)

// 配置结构体
type Config struct {
	// 数据库配置
	DBHost     string `json:"db_host"`
	DBPort     int    `json:"db_port"`
	DBName     string `json:"db_name"`
	DBUser     string `json:"db_user"`
	DBPassword string `json:"db_password"`

	// JWT配置
	JWTPrivateKey string `json:"jwt_private_key"`

	// Seahub配置
	SeahubURL string `json:"seahub_url"`
}

// JWT Claims结构体
type BaiduModuleClaims struct {
	Username   string `json:"username"`
	Module     string `json:"module"`
	IsInternal bool   `json:"is_internal"`
	jwt.StandardClaims
}

// 用户信息结构体
type UserInfo struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	IsActive bool   `json:"is_active"`
}

// 仓库信息结构体
type RepoInfo struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Owner        string    `json:"owner"`
	Permission   string    `json:"permission"`
	Type         string    `json:"type"`
	Encrypted    bool      `json:"encrypted"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"last_modified"`
}

// 百度网盘模块服务
type BaiduModuleService struct {
	config *Config
	db     *sql.DB
}

// 初始化服务
func NewBaiduModuleService(config *Config) (*BaiduModuleService, error) {
	// 连接数据库
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.DBUser, config.DBPassword, config.DBHost, config.DBPort, config.DBName)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("数据库连接失败: %v", err)
	}

	// 测试数据库连接
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("数据库连接测试失败: %v", err)
	}

	return &BaiduModuleService{
		config: config,
		db:     db,
	}, nil
}

// 验证JWT token
func (s *BaiduModuleService) ValidateJWTToken(tokenString string) (*BaiduModuleClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &BaiduModuleClaims{}, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("无效的签名方法: %v", token.Header["alg"])
		}
		return []byte(s.config.JWTPrivateKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("JWT token解析失败: %v", err)
	}

	if claims, ok := token.Claims.(*BaiduModuleClaims); ok && token.Valid {
		// 验证token是否为百度网盘模块专用
		if claims.Module != "baidu_netdisk" || !claims.IsInternal {
			return nil, fmt.Errorf("无效的模块token")
		}
		return claims, nil
	}

	return nil, fmt.Errorf("无效的JWT token")
}

// 获取用户信息
func (s *BaiduModuleService) GetUserInfo(username string) (*UserInfo, error) {
	var userInfo UserInfo
	query := `
		SELECT email, is_active 
		FROM EmailUser 
		WHERE email = ?
	`

	err := s.db.QueryRow(query, username).Scan(&userInfo.Email, &userInfo.IsActive)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("用户不存在: %s", username)
		}
		return nil, fmt.Errorf("查询用户信息失败: %v", err)
	}

	userInfo.Username = username
	return &userInfo, nil
}

// 获取用户可访问的仓库列表
func (s *BaiduModuleService) GetUserRepos(username string) ([]RepoInfo, error) {
	var repos []RepoInfo

	// 查询用户拥有的仓库
	ownedRepos, err := s.getOwnedRepos(username)
	if err != nil {
		return nil, err
	}
	repos = append(repos, ownedRepos...)

	// 查询共享给用户的仓库
	sharedRepos, err := s.getSharedRepos(username)
	if err != nil {
		return nil, err
	}
	repos = append(repos, sharedRepos...)

	// 查询用户所在群组的仓库
	groupRepos, err := s.getGroupRepos(username)
	if err != nil {
		return nil, err
	}
	repos = append(repos, groupRepos...)

	return repos, nil
}

// 获取用户拥有的仓库
func (s *BaiduModuleService) getOwnedRepos(username string) ([]RepoInfo, error) {
	var repos []RepoInfo
	query := `
		SELECT repo_id, repo_name, user_name, encrypted, size, last_modify
		FROM Repo 
		WHERE user_name = ?
	`

	rows, err := s.db.Query(query, username)
	if err != nil {
		return nil, fmt.Errorf("查询拥有的仓库失败: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var repo RepoInfo
		var lastModifyUnix int64

		err := rows.Scan(&repo.ID, &repo.Name, &repo.Owner,
			&repo.Encrypted, &repo.Size, &lastModifyUnix)
		if err != nil {
			continue
		}

		repo.Permission = "rw"
		repo.Type = "owned"
		repo.LastModified = time.Unix(lastModifyUnix, 0)
		repos = append(repos, repo)
	}

	return repos, nil
}

// 获取共享给用户的仓库
func (s *BaiduModuleService) getSharedRepos(username string) ([]RepoInfo, error) {
	var repos []RepoInfo
	query := `
		SELECT r.repo_id, r.repo_name, r.user_name, r.encrypted, r.size, r.last_modify, s.permission
		FROM Repo r
		JOIN SharedRepo s ON r.repo_id = s.repo_id
		WHERE s.to_email = ? AND s.from_email != ?
	`

	rows, err := s.db.Query(query, username, username)
	if err != nil {
		return nil, fmt.Errorf("查询共享仓库失败: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var repo RepoInfo
		var lastModifyUnix int64

		err := rows.Scan(&repo.ID, &repo.Name, &repo.Owner,
			&repo.Encrypted, &repo.Size, &lastModifyUnix, &repo.Permission)
		if err != nil {
			continue
		}

		repo.Type = "shared"
		repo.LastModified = time.Unix(lastModifyUnix, 0)
		repos = append(repos, repo)
	}

	return repos, nil
}

// 获取用户所在群组的仓库
func (s *BaiduModuleService) getGroupRepos(username string) ([]RepoInfo, error) {
	var repos []RepoInfo
	query := `
		SELECT r.repo_id, r.repo_name, r.user_name, r.encrypted, r.size, r.last_modify, gr.permission
		FROM Repo r
		JOIN RepoGroup rg ON r.repo_id = rg.repo_id
		JOIN GroupMember gm ON rg.group_id = gm.group_id
		LEFT JOIN RepoGroupPerm gr ON rg.repo_id = gr.repo_id AND rg.group_id = gr.group_id
		WHERE gm.user_name = ?
	`

	rows, err := s.db.Query(query, username)
	if err != nil {
		return nil, fmt.Errorf("查询群组仓库失败: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var repo RepoInfo
		var lastModifyUnix int64
		var permission sql.NullString

		err := rows.Scan(&repo.ID, &repo.Name, &repo.Owner,
			&repo.Encrypted, &repo.Size, &lastModifyUnix, &permission)
		if err != nil {
			continue
		}

		if permission.Valid {
			repo.Permission = permission.String
		} else {
			repo.Permission = "r"
		}
		repo.Type = "group"
		repo.LastModified = time.Unix(lastModifyUnix, 0)
		repos = append(repos, repo)
	}

	return repos, nil
}

// 检查用户对仓库的权限
func (s *BaiduModuleService) CheckRepoPermission(username, repoID string) (string, error) {
	// 检查是否是仓库拥有者
	var ownerCount int
	ownerQuery := "SELECT COUNT(*) FROM Repo WHERE repo_id = ? AND user_name = ?"
	err := s.db.QueryRow(ownerQuery, repoID, username).Scan(&ownerCount)
	if err != nil {
		return "", fmt.Errorf("检查仓库拥有者失败: %v", err)
	}
	if ownerCount > 0 {
		return "rw", nil
	}

	// 检查共享权限
	var sharedPermission sql.NullString
	sharedQuery := "SELECT permission FROM SharedRepo WHERE repo_id = ? AND to_email = ?"
	err = s.db.QueryRow(sharedQuery, repoID, username).Scan(&sharedPermission)
	if err == nil && sharedPermission.Valid {
		return sharedPermission.String, nil
	}

	// 检查群组权限
	var groupPermission sql.NullString
	groupQuery := `
		SELECT COALESCE(rgp.permission, 'r') 
		FROM RepoGroup rg
		JOIN GroupMember gm ON rg.group_id = gm.group_id
		LEFT JOIN RepoGroupPerm rgp ON rg.repo_id = rgp.repo_id AND rg.group_id = rgp.group_id
		WHERE rg.repo_id = ? AND gm.user_name = ?
		LIMIT 1
	`
	err = s.db.QueryRow(groupQuery, repoID, username).Scan(&groupPermission)
	if err == nil && groupPermission.Valid {
		return groupPermission.String, nil
	}

	return "", fmt.Errorf("用户无权限访问此仓库")
}

// HTTP中间件：JWT认证
func (s *BaiduModuleService) JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少Authorization头"})
			c.Abort()
			return
		}

		// 解析Bearer token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的Authorization格式"})
			c.Abort()
			return
		}

		// 验证JWT token
		claims, err := s.ValidateJWTToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		// 将用户信息存储到context中
		c.Set("username", claims.Username)
		c.Next()
	}
}

// API处理器：获取用户信息
func (s *BaiduModuleService) GetUserInfoHandler(c *gin.Context) {
	username := c.MustGet("username").(string)

	userInfo, err := s.GetUserInfo(username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, userInfo)
}

// API处理器：获取用户仓库列表
func (s *BaiduModuleService) GetUserReposHandler(c *gin.Context) {
	username := c.MustGet("username").(string)

	repos, err := s.GetUserRepos(username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"repos": repos,
		"total": len(repos),
	})
}

// API处理器：检查仓库权限
func (s *BaiduModuleService) CheckRepoPermissionHandler(c *gin.Context) {
	username := c.MustGet("username").(string)
	repoID := c.Param("repo_id")

	if repoID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少repo_id参数"})
		return
	}

	permission, err := s.CheckRepoPermission(username, repoID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"repo_id":    repoID,
		"permission": permission,
		"has_access": true,
	})
}

// API处理器：从Seahub获取JWT token
func (s *BaiduModuleService) GetJWTTokenHandler(c *gin.Context) {
	// 这个端点用于前端获取JWT token
	// 前端需要先通过session cookie调用Seahub的JWT token生成接口

	c.JSON(http.StatusOK, gin.H{
		"message":         "请使用前端session cookie调用 /api/v2.1/baidu-module/jwt-token/ 获取JWT token",
		"seahub_endpoint": s.config.SeahubURL + "/api/v2.1/baidu-module/jwt-token/",
	})
}

// 设置路由
func (s *BaiduModuleService) SetupRoutes() *gin.Engine {
	r := gin.Default()

	// 启用CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// 公开端点
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/jwt-token", s.GetJWTTokenHandler)

	// 需要JWT认证的API
	api := r.Group("/api/v1")
	api.Use(s.JWTAuthMiddleware())
	{
		api.GET("/user/info", s.GetUserInfoHandler)
		api.GET("/user/repos", s.GetUserReposHandler)
		api.GET("/repos/:repo_id/permission", s.CheckRepoPermissionHandler)

		// 百度网盘相关的API可以在这里添加
		api.POST("/baidu/sync", func(c *gin.Context) {
			username := c.MustGet("username").(string)
			c.JSON(http.StatusOK, gin.H{
				"message":  "百度网盘同步功能",
				"username": username,
			})
		})
	}

	return r
}

// 主函数示例
func main() {
	// 配置
	config := &Config{
		DBHost:        "localhost",
		DBPort:        3306,
		DBName:        "seahub_db",
		DBUser:        "seahub",
		DBPassword:    "your_password",
		JWTPrivateKey: "your_jwt_private_key", // 与Seahub相同
		SeahubURL:     "http://localhost:8000",
	}

	// 初始化服务
	service, err := NewBaiduModuleService(config)
	if err != nil {
		log.Fatal("初始化服务失败:", err)
	}
	defer service.db.Close()

	// 设置路由
	router := service.SetupRoutes()

	// 启动服务器
	log.Println("百度网盘模块启动在端口 :9000")
	log.Fatal(router.Run(":9000"))
}
