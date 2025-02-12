#!/usr/bin/env python3
import sys
import os
import logging
from pathlib import Path
import traceback

# 配置日志
log_dir = os.path.expanduser('~/Library/Logs/Fava')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'fava.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

def main():
    try:
        logging.info("Starting Fava launcher...")
        logging.info(f"Python version: {sys.version}")
        logging.info(f"Arguments: {sys.argv}")
        logging.info(f"Current directory: {os.getcwd()}")
        logging.info(f"PYTHONPATH: {os.environ.get('PYTHONPATH', '')}")
        
        if len(sys.argv) != 2:
            logging.error("Error: Missing beancount file path")
            sys.exit(1)
            
        beancount_file = sys.argv[1]
        logging.info(f"Loading beancount file: {beancount_file}")
        
        # Convert to absolute path
        beancount_file = os.path.abspath(beancount_file)
        logging.info(f"Absolute path: {beancount_file}")
        
        if not os.path.exists(beancount_file):
            logging.error(f"Error: Beancount file not found: {beancount_file}")
            sys.exit(1)
            
        # 设置 Python 路径
        if getattr(sys, 'frozen', False):
            # 如果是打包后的应用
            base_path = os.path.dirname(sys.executable)
            if 'Resources' not in base_path:
                base_path = os.path.join(os.path.dirname(os.path.dirname(sys.executable)), 'Resources')
            
            # 添加所需的包路径到 Python 路径
            packages_path = base_path
            if packages_path not in sys.path:
                sys.path.insert(0, packages_path)
                logging.info(f"Added {packages_path} to Python path")
                
            # 设置 fava 资源路径
            fava_path = os.path.join(base_path, 'fava')
            templates_path = os.path.join(fava_path, 'templates')
            static_path = os.path.join(fava_path, 'static')
            translations_path = os.path.join(fava_path, 'translations')
            
            # 检查所有资源目录
            for path in [fava_path, templates_path, static_path, translations_path]:
                if os.path.exists(path):
                    logging.info(f"Found resource directory: {path}")
                    if os.path.isdir(path):
                        logging.info(f"Contents of {path}:")
                        for item in os.listdir(path):
                            logging.info(f"  - {item}")
                else:
                    logging.error(f"Resource directory not found: {path}")
        else:
            # 开发环境
            import fava
            base_path = os.path.dirname(fava.__file__)
            templates_path = os.path.join(base_path, 'templates')
            static_path = os.path.join(base_path, 'static')
            translations_path = os.path.join(base_path, 'translations')
            
        logging.info(f"Base path: {base_path}")
        logging.info(f"Templates path: {templates_path}")
        logging.info(f"Static path: {static_path}")
        logging.info(f"Translations path: {translations_path}")
        
        # 设置环境变量
        os.environ['FAVA_TEMPLATES_PATH'] = templates_path
        os.environ['FAVA_STATIC_PATH'] = static_path
        os.environ['FAVA_TRANSLATIONS_PATH'] = translations_path
        
        # 在导入 fava 之前，先设置 __version__
        import fava
        if not hasattr(fava, '__version__'):
            logging.info("Setting fava.__version__")
            fava.__version__ = '1.0.0'  # 使用一个默认版本号
            
        try:
            from fava.application import create_app
            logging.info("Successfully imported fava.application")
            
            # 创建应用
            app = create_app([Path(beancount_file)])
            logging.info("Created Fava application")
            
            # 设置应用路径
            app.template_folder = templates_path
            app.static_folder = static_path
            logging.info(f"Set template folder to: {app.template_folder}")
            logging.info(f"Set static folder to: {app.static_folder}")
            
            # 列出可用的模板
            logging.info("Available templates:")
            for template in app.jinja_loader.list_templates():
                logging.info(f"  - {template}")
            
            # 启动服务器
            app.run('127.0.0.1', 5000)
            
        except ImportError as e:
            logging.error(f"Failed to import fava: {e}")
            logging.error("PYTHONPATH might not be set correctly")
            logging.error(f"Python path: {sys.path}")
            sys.exit(1)
            
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        logging.error(traceback.format_exc())
        sys.exit(1)

if __name__ == '__main__':
    main()
