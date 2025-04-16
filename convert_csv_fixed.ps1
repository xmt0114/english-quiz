$csvDir = "E:\code\web\mock_examiner\english-quiz\public\data\csv"
$files = Get-ChildItem -Path $csvDir -Filter "*_qa.csv"

foreach ($file in $files) {
    $baseName = $file.BaseName
    $newFileName = "${baseName}_fixed.csv"
    $newFilePath = Join-Path -Path $csvDir -ChildPath $newFileName
    
    Write-Host "Processing $($file.Name) -> $newFileName"
    
    # 读取原始文件内容
    $content = Get-Content -Path $file.FullName -Encoding UTF8 -Raw
    
    # 检查文件是否为空
    if ([string]::IsNullOrEmpty($content)) {
        Write-Host "Warning: File $($file.Name) is empty or could not be read properly."
        continue
    }
    
    # 分割内容为行
    $lines = $content -split "`r`n|`r|`n"
    
    # 检查是否有足够的行
    if ($lines.Count -lt 2) {
        Write-Host "Warning: File $($file.Name) does not have enough lines."
        continue
    }
    
    # 替换标题行
    $lines[0] = "Category,ThemeWord,ImagePath,Description,Question,Answer"
    
    # 将所有行重新组合为一个字符串
    $newContent = $lines -join "`r`n"
    
    # 写入新文件
    [System.IO.File]::WriteAllText($newFilePath, $newContent, [System.Text.Encoding]::UTF8)
    
    # 验证新文件
    $newFileContent = Get-Content -Path $newFilePath -Encoding UTF8 -TotalCount 10
    Write-Host "First 10 lines of ${newFileName}:"
    $newFileContent | ForEach-Object { Write-Host $_ }
    
    Write-Host "Created $newFileName"
    Write-Host "-----------------------------------"
}

Write-Host "All files processed."
