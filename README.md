# qPCR 2^-ΔΔCt Web App

一个纯前端 qPCR 结果分析工具。直接用浏览器打开 `index.html` 即可使用，不需要安装依赖、启动服务或上传数据。

## 数据格式

粘贴 CSV、TSV，或从 Excel 复制表格。必须包含以下表头：

```text
sample,group,gene,ct
```

也可以使用中文表头：`样本,分组,基因,Ct值`。

- `sample`: 生物样本编号
- `group`: 实验分组
- `gene`: 基因名，包括目标基因和内参基因
- `ct`: Ct 值

同一样本、同一组、同一基因的多行 Ct 会按技术重复取平均。

## 计算方法

1. 每个样本先计算 `ΔCt = target Ct - reference Ct`
2. 对照组计算平均 `ΔCt`
3. 每个样本计算 `ΔΔCt = sample ΔCt - control mean ΔCt`
4. 相对表达量为 `2^-ΔΔCt`

统计检验在 `ΔCt` 尺度上进行：

- 非对照组 vs 对照组：Welch t-test
- 多组总体差异：one-way ANOVA

## 使用

打开：

```text
/data/user/mowp/workspace/qPCR_tools/index.html
```

页面内可以下载 SVG 图和结果 CSV。
