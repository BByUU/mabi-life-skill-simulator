# 資料來源與重建

來源：噴嚏精靈的[生活技能修練試算表](https://docs.google.com/spreadsheets/d/1Ax4M2ycAv-XMDUo-DldQVt3cGiYRaz5cCTCONSoH46c/edit?gid=785953580)。網站使用 JSON 快照，不會在每次開啟時連線 Google Sheets。

擷取程式需要 Python 與 openpyxl，並使用公開下載的 XLSX 及工作表網頁取得各分頁 gid。原始 XLSX 不會部署到網站。

在 `scripts/` 旁建立 `source/` 資料夾，下載以下兩份公開檔案：

```text
source/mabinogi-source.xlsx
https://docs.google.com/spreadsheets/d/1Ax4M2ycAv-XMDUo-DldQVt3cGiYRaz5cCTCONSoH46c/export?format=xlsx

source/source.html
https://docs.google.com/spreadsheets/d/1Ax4M2ycAv-XMDUo-DldQVt3cGiYRaz5cCTCONSoH46c/edit
```

執行 `python scripts/extract_data.py`。產出的 `source/skills-data.json` 應先檢查 `unresolvedMaterials`、每項來源列及日期，再替換 `dist/data/skills.json`，執行 `npm test`。擷取程式以 2025-02-04 版的欄位與版型編寫；若原表改欄位或修練項目，必須先更新程式，不能盲目覆蓋正式資料。

每項 `baseValue` 為 0 至 100 尺度的原始修練值，`maxCount` 為次數上限。`recommended` 表示原表有安排該項路線。`materials[].perAction` 為公式在該項達成一次時的用量；跨列依賴無法獨立求值時標 `partial`。`recipeVariants` 保留同項的替代配方，但共用原項的修練上限。

禁止將原表快取的修練結果當成目前倍率結果。禁止將總材料小計的 `/2` 當作材料減免。需保留原作者署名、來源網址和原表日期。
