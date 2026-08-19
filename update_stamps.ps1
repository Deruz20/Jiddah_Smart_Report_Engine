$files = Get-ChildItem -Path "src\components\reports" -Filter "*Report.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false

    if ($content -match 'stamp-box' -or $content -match 'school-stamp') {
        if ($content -notmatch 'import \{ SchoolStamp \}') {
            $content = $content -replace 'import \{ ReportContainer \}', "import { SchoolStamp } from '@/components/reports/SchoolStamp'
import { ReportContainer }"
            $modified = $true
        }
        
        # Replace stamp-box div (multiline)
        if ($content -match '<div className="stamp-box">[\s\S]*?</div>') {
            $content = $content -replace '<div className="stamp-box">[\s\S]*?</div>', '<SchoolStamp date={reportData?.term?.end_date} />'
            $modified = $true
        }
        
        # Replace BOT signature block
        if ($content -match '\{reportData\?\.signatures\?\.\[''school-stamp''\][\s\S]*?\}') {
            $content = $content -replace '\{reportData\?\.signatures\?\.\[''school-stamp''\][\s\S]*?\}', '<SchoolStamp date={reportData?.term?.end_date} />'
            $modified = $true
        }

        if ($modified) {
            Set-Content -Path $file.FullName -Value $content
            Write-Host "Updated $($file.Name)"
        }
    }
}
