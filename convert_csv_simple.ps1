$csvDir = "E:\code\web\mock_examiner\english-quiz\public\data\csv"
$files = Get-ChildItem -Path $csvDir -Filter "*_qa.csv"

foreach ($file in $files) {
    $baseName = $file.BaseName
    $newFileName = "${baseName}_fixed.csv"
    $newFilePath = Join-Path -Path $csvDir -ChildPath $newFileName
    
    Write-Host "Processing $($file.Name) -> $newFileName"
    
    # 读取原始文件内容
    $content = Get-Content -Path $file.FullName -Encoding UTF8
    
    # 检查文件是否为空
    if ($content.Count -eq 0) {
        Write-Host "Warning: File $($file.Name) is empty or could not be read properly."
        continue
    }
    
    # 替换标题行
    $content[0] = "Category,ThemeWord,ImagePath,Description,Question,Answer"
    
    # 写入新文件
    $content | Out-File -FilePath $newFilePath -Encoding UTF8
    
    Write-Host "Created $newFileName"
}

Write-Host "All files processed."
