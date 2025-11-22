from playwright.sync_api import sync_playwright


def generate_sdoc_thumbnail(url: str, save_path: str, viewport_size: tuple = (800, 600)):
    """
    生成sdoc页面的缩略图
    :param url: 目标sdoc页面URL
    :param save_path: 缩略图保存路径（如"thumbnail.png"）
    :param viewport_size: 截图视口大小（宽度, 高度），直接影响缩略图尺寸
    """
    with sync_playwright() as p:
        # 启动Chromium浏览器（headless模式，无界面）
        browser = p.chromium.launch(headless=True)
        # 新建页面并设置视口大小
        page = browser.new_page(viewport={"width": viewport_size[0], "height": viewport_size[1]})
        
        try:
            # 访问目标页面，等待网络空闲（确保页面完全渲染）
            page.goto(url, wait_until="networkidle", timeout=60000)  # 超时设为60秒
            
            # 可选：等待特定元素加载（若sdoc有标志性元素）
            # page.wait_for_selector("div.sdoc-content", timeout=30000)
            
            # 截图生成缩略图（支持png/jpg，jpg可设置quality）
            page.screenshot(
                path=save_path,
                full_page=False,  # 只截取视口内内容（缩略图核心）
                #  # 仅jpg有效，质量0-100
                # clip={"x": 0, "y": 0, "width": 400, "height": 300}  # 可选：裁剪更小区域
            )
            print(f"缩略图已保存至：{save_path}")
        
        except Exception as e:
            print(f"生成失败：{e}")
        finally:
            # 关闭浏览器
            browser.close()


# 调用示例
if __name__ == "__main__":
    # target_url = "https://lib/xxxxxx/xxxxx/file.sdoc"
    target_url = "https://www.baidu.com/"
    generate_sdoc_thumbnail(target_url, "sdoc_thumbnail.png", viewport_size=(800, 600))