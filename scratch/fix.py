import glob

replacements = {
    r"background-color: \\\;": "background-color: ;",
    r"color: \\\;": "color: ;",
    r"border: 4px solid \\\;": "border: 4px solid ;",
    r"border: 1.5px solid \\\;": "border: 1.5px solid ;",
    r"--primary-green: \\\;": "--primary-green: ;",
    r"--dark-green: \\\;": "--dark-green: ;",
    r"--accent-gold: \\\;": "--accent-gold: ;",
    r"--secondary-green: \\\;": "--secondary-green: ;",
    r"--nursery-gold: \\\;": "--nursery-gold: ;",
    r"--nursery-text: \\\;": "--nursery-text: ;",
}

for file in glob.glob('src/components/reports/*.tsx'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for k, v in replacements.items():
        content = content.replace(k, v)
        
    if content != original:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file}")
