import os

src_dir = '/Users/mugil/Desktop/Billing_Software_backup_1/frontend/src'

def process_file(file_path):
    if file_path.endswith('utils/api.js') or file_path.endswith('utils/api.jsx'):
        return
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "import axios from 'axios';" in content:
        # Determine relative path
        rel_dir = os.path.relpath(os.path.join(src_dir, 'utils'), os.path.dirname(file_path))
        api_path = os.path.join(rel_dir, 'api').replace('\\', '/')
        if not api_path.startswith('.') and not api_path.startswith('/'):
            api_path = './' + api_path
            
        print(f"Refactoring {os.path.relpath(file_path, src_dir)} -> importing from {api_path}")
        
        # Replace
        new_content = content.replace("import axios from 'axios';", f"import axios from '{api_path}';")
        with open(file_path, 'w', encoding='utf-8') as f_out:
            f_out.write(new_content)

def walk_dir(path):
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                process_file(os.path.join(root, file))

walk_dir(src_dir)
print("Refactoring complete!")
