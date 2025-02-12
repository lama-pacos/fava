#!/usr/bin/env python3
import sys
import os
from fava.application import create_app
from pathlib import Path

def main():
    print("Starting Fava launcher...")
    print("Arguments:", sys.argv)
    print("Current directory:", os.getcwd())
    
    if len(sys.argv) != 2:
        print("Error: Missing beancount file path")
        sys.exit(1)
        
    beancount_file = sys.argv[1]
    print("Loading beancount file:", beancount_file)
    
    # Convert to absolute path
    beancount_file = os.path.abspath(beancount_file)
    
    if not os.path.exists(beancount_file):
        print("Error: Beancount file not found:", beancount_file)
        sys.exit(1)
        
    try:
        app = create_app([Path(beancount_file)])
        print("Successfully loaded beancount file")
        app.run('localhost', 5000)
    except Exception as e:
        print("Error starting Fava:", str(e))
        sys.exit(1)

if __name__ == '__main__':
    main()
