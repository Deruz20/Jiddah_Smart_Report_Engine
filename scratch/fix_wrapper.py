import glob

for file in glob.glob('src/components/reports/*.tsx'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<div className={print-wrapper }>' in content:
        content = content.replace(
            '<div className={print-wrapper }>',
            '<div className={print-wrapper }>'
        )
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed print-wrapper in {file}")
