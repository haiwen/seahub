#!/usr/bin/env python3
"""
百度网盘API调试脚本
快速测试百度网盘文件列表API是否正常工作
"""

import os
import sys
import django
from django.conf import settings

# 设置Django环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "seahub.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from seahub.baidu.network_libs_api import BaiduNetdiskFilesView
from django.test import RequestFactory
from django.contrib.auth.models import User


def test_baidu_api():
    """测试百度网盘API"""
    print("🚀 开始测试百度网盘API...")

    # 创建模拟请求
    factory = RequestFactory()
    request = factory.get("/api/v2.1/baidu/netdisk/files/", {"path": "/"})

    # 需要一个用户（请替换为实际用户）
    try:
        user = User.objects.first()
        if not user:
            print("❌ 没有找到用户，请先创建用户")
            return
        request.user = user
        print(f"👤 使用用户: {user.username}")
    except Exception as e:
        print(f"❌ 获取用户失败: {e}")
        return

    # 创建视图实例并调用
    view = BaiduNetdiskFilesView()
    try:
        response = view.get(request)
        print(f"📊 API响应状态码: {response.status_code}")
        print(f"📄 API响应数据: {response.data}")

        if response.status_code == 200:
            files = response.data.get("files", [])
            print(f"✅ 成功获取 {len(files)} 个文件/文件夹")
            for i, file in enumerate(files[:5]):  # 只显示前5个
                print(
                    f"  📁 {i+1}. {file.get('name')} ({'文件夹' if file.get('is_dir') else '文件'})"
                )
        else:
            print(f"❌ API调用失败: {response.data}")

    except Exception as e:
        print(f"💥 API调用异常: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_baidu_api()
