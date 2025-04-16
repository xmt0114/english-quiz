$csvDir = "E:\code\web\mock_examiner\english-quiz\public\data\csv"
$files = Get-ChildItem -Path $csvDir -Filter "*_qa.csv"

foreach ($file in $files) {
    $baseName = $file.BaseName
    $newFileName = "$baseName`_fixed.csv"
    $newFilePath = Join-Path -Path $csvDir -ChildPath $newFileName
    
    Write-Host "Processing $($file.Name) -> $newFileName"
    
    # 读取第一行（标题行）
    $header = Get-Content -Path $file.FullName -TotalCount 1 -Encoding UTF8
    
    # 创建新的标题行
    $newHeader = "Category,ThemeWord,ImagePath,Description,Question,Answer"
    
    # 创建新文件，写入新标题行
    Set-Content -Path $newFilePath -Value $newHeader -Encoding UTF8
    
    # 将原始文件的内容（除了标题行）追加到新文件
    Get-Content -Path $file.FullName -Encoding UTF8 | Select-Object -Skip 1 | Add-Content -Path $newFilePath -Encoding UTF8
    
    Write-Host "Created $newFileName"
}

Write-Host "All files processed."
