# Jack 文件整理台

> 本地静态文件整理工具：根据文件名、类型与文本线索给出分类和命名建议，不上传你的文件。

Contact: **Jacksun** · [qinji@jack-sun.com](mailto:qinji@jack-sun.com)

![jack-file-organizer project visual](docs/assets/jack-file-organizer-hero.png)

## 怎么用

1. 打开 `index.html`
2. 选择文件或文件夹
3. 看工具自动分成：
   - `01_客户交付`
   - `02_创作策划`
   - `03_知识库`
   - `04_素材`
   - `05_个人`
   - `90_待归档`
4. 选中某个文件，查看建议目录、重命名方案和判断理由
5. 点击「导出整理清单」，拿到 CSV 结果

## 本地启动

如果你想通过本地服务器打开：

```bash
cd jack-file-organizer
python3 -m http.server 4173
```

然后访问：

`http://localhost:4173/index.html`

## 整理原则

- 先分门类，再谈效率
- 先看交付，再看知识，再看素材
- 命名要清楚，别搞 PPT 式混乱
- 优先把能影响收入和交付的文件挑出来
