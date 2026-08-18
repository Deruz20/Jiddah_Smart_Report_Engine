import os
import re

def fix_table(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue:
    # Row 1 currently has COMPARATIVE PERFORMANCE with colSpan=5, and missing COMMENT.
    # Row 2 currently has BOT, MOT, EOT, and COMMENT.
    # Row 3 currently has empty colSpan=2, and MARK, AGG, MARK... wait.

    # Let's completely replace the <thead> of the circular table
    
    # We find the table inside `className="secular-table"` or just the first table after `<h2>{reportData?.term?.term_name...}`
    # Instead, we can use regex to replace the specific thead block.

    old_thead = """                <thead>
                  <tr>
                    <th colSpan={2} rowSpan={2} style={{ width: "22%" }}>
                      SUBJECTS
                    </th>
                    <th colSpan={5} className="table-title">
                      COMPARATIVE PERFORMANCE
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={2}>
                      BEGINNING OF
                      <br />
                      TERM
                    </th>
                    <th colSpan={2}>MIDTERM</th>
                    <th colSpan={2}>END OF TERM</th>
                    <th rowSpan={2} style={{ width: "25%" }}>
                      SUBJECT
                      <br />
                      TEACHER'S
                      <br />
                      COMMENT
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={2}></th>
                    <th style={{ width: "8%" }}>MARK</th>
                    <th style={{ width: "8%" }}>AGG</th>
                    <th style={{ width: "8%" }}>MARK</th>
                    <th style={{ width: "8%" }}>AGG</th>
                    <th style={{ width: "8%" }}>MARK</th>
                    <th style={{ width: "8%" }}>AGG</th>
                  </tr>
                </thead>"""
                
    new_thead = """                <thead>
                  <tr>
                    <th colSpan={2} rowSpan={2} style={{ width: "22%" }}>
                      SUBJECTS
                    </th>
                    <th colSpan={6} className="table-title">
                      COMPARATIVE PERFORMANCE
                    </th>
                    <th rowSpan={2} style={{ width: "30%" }}>
                      SUBJECT
                      <br />
                      TEACHER'S
                      <br />
                      COMMENT
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={2}>
                      BEGINNING OF
                      <br />
                      TERM
                    </th>
                    <th colSpan={2}>MIDTERM</th>
                    <th colSpan={2}>END OF TERM</th>
                  </tr>
                  <tr>
                    <th colSpan={2}></th>
                    <th style={{ width: "8%" }}>MARK</th>
                    <th style={{ width: "8%" }}>AGG</th>
                    <th style={{ width: "8%" }}>MARK</th>
                    <th style={{ width: "8%" }}>AGG</th>
                    <th style={{ width: "8%" }}>MARK</th>
                    <th style={{ width: "8%" }}>AGG</th>
                    <th></th>
                  </tr>
                </thead>"""
    
    if old_thead in content:
        content = content.replace(old_thead, new_thead)
    
    # We also need to fix the theology table
    # "theology table is shrunk and incomplete"
    # Theology table has rowSpan=3 on "المواد"
    # But then 3 rows.
    # Let's check what the theology table looks like.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for term in ['EOT', 'MOT', 'BOT']:
    fix_table(f"src/components/reports/Primary{term}Report.tsx")

print("Fixed tables!")
