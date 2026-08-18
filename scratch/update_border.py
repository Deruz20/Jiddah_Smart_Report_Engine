import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the broken border-image with a reliable premium frame border
    old_border = "border: 12px solid transparent;\n            border-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpolygon points='20,5 25,20 40,20 28,28 32,40 20,32 8,40 12,28 0,20 15,20' fill='%23dc2626'/%3E%3Cpolygon points='20,10 25,20 20,30 15,20' fill='%23881337'/%3E%3C/svg%3E\") 15 round;"
    new_border = """/* Premium Frame Border */
            border: 6px double var(--dark-maroon);
            outline: 2px solid var(--primary-green);
            outline-offset: 2px;
            margin: 4px; /* Space for outline */"""
            
    content = content.replace(old_border, new_border)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for term in ['EOT', 'MOT', 'BOT']:
    fix_file(f"src/components/reports/Primary{term}Report.tsx")

print("Fixed borders!")
