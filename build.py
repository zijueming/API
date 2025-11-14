"""
打包脚本 - 使用 PyInstaller 将 Flask 应用打包成可执行文件
运行方式: python build.py
"""
import os
import sys
import subprocess
import shutil

def main():
    print("=" * 60)
    print("开始打包 Flask 应用...")
    print("=" * 60)
    
    # 检查并安装所有依赖
    print("\n检查依赖包...")
    required_packages = ["flask", "cozepy", "edge-tts", "pyinstaller"]
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == "edge-tts":
                __import__("edge_tts")
            elif package == "pyinstaller":
                __import__("PyInstaller")
            else:
                __import__(package)
            print(f"  ✓ {package} 已安装")
        except ImportError:
            missing_packages.append(package)
            print(f"  ✗ {package} 未安装")
    
    if missing_packages:
        print(f"\n正在安装缺失的依赖: {', '.join(missing_packages)}")
        for package in missing_packages:
            print(f"  安装 {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print("所有依赖安装完成！")
    
    # 清理之前的构建文件
    print("\n清理之前的构建文件...")
    for folder in ["build", "dist", "__pycache__"]:
        if os.path.exists(folder):
            shutil.rmtree(folder)
            print(f"已删除: {folder}/")
    
    if os.path.exists("app.spec"):
        os.remove("app.spec")
        print("已删除: app.spec")
    
    # PyInstaller 命令参数 - 使用 python -m PyInstaller 更可靠
    # 确保所有依赖都被正确包含
    cmd = [
        sys.executable,  # 使用当前 Python 解释器
        "-m", "PyInstaller",
        "--name=时空对话",  # 可执行文件名称
        "--onefile",  # 打包成单个文件
        "--windowed",  # Windows 下不显示控制台窗口（如果需要看到日志，可以去掉这个参数）
        "--add-data=templates;templates",  # 包含模板文件夹
        "--add-data=static;static",  # 包含静态文件文件夹
        "--add-data=VIDEO;VIDEO",  # 包含视频文件夹
        # Flask 相关导入
        "--hidden-import=flask",
        "--hidden-import=flask.app",
        "--hidden-import=flask.helpers",
        "--hidden-import=flask.templating",
        "--hidden-import=flask.wrappers",
        "--hidden-import=werkzeug",
        "--hidden-import=werkzeug.serving",
        "--hidden-import=werkzeug.wrappers",
        "--hidden-import=jinja2",
        "--hidden-import=click",
        "--hidden-import=itsdangerous",
        "--hidden-import=markupsafe",
        # cozepy 相关导入
        "--hidden-import=cozepy",
        "--hidden-import=cozepy.client",
        "--hidden-import=cozepy.auth",
        "--hidden-import=cozepy.models",
        # edge_tts 相关导入
        "--hidden-import=edge_tts",
        "--hidden-import=edge_tts.Communicate",
        # 其他标准库导入
        "--hidden-import=asyncio",
        "--hidden-import=json",
        "--hidden-import=webbrowser",
        "--hidden-import=threading",
        "--hidden-import=time",
        "--hidden-import=typing",
        "--hidden-import=base64",
        # 收集所有数据文件（包括所有子模块和资源文件）
        "--collect-all=flask",  # 收集 Flask 的所有数据文件和子模块
        "--collect-all=werkzeug",  # 收集 Werkzeug 的所有数据文件
        "--collect-all=jinja2",  # 收集 Jinja2 的所有数据文件
        "--collect-all=edge_tts",  # 收集 edge_tts 的所有数据文件
        "--collect-all=cozepy",  # 收集 cozepy 的所有数据文件
        # 包含 tts_helper 模块
        "--hidden-import=tts_helper",
        # 确保包含所有依赖
        "--noconfirm",  # 不询问确认，直接覆盖
        "app.py"  # 主程序文件
    ]
    
    print("\n开始执行 PyInstaller...")
    print(f"执行命令: {' '.join(cmd)}")
    print("-" * 60)
    
    try:
        # 执行打包命令
        result = subprocess.run(cmd, check=True, capture_output=False)
        
        print("-" * 60)
        print("\n" + "=" * 60)
        print("打包完成！")
        print("=" * 60)
        print(f"\n可执行文件位置: dist/时空对话.exe")
        print(f"\n提示:")
        print("  - 可执行文件在 dist/ 目录下")
        print("  - 可以将 dist/时空对话.exe 复制到任何 Windows 系统运行")
        print("  - 首次运行可能需要几秒钟启动时间")
        print("  - 运行后会自动打开浏览器访问 http://127.0.0.1:5000")
        print("=" * 60)
        
    except subprocess.CalledProcessError as e:
        print(f"\n错误: 打包失败，返回码 {e.returncode}")
        print("请检查错误信息并重试")
        sys.exit(1)
    except Exception as e:
        print(f"\n错误: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

