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

默认打开页面时不会自动填入示例数据。点击输入框上方的“载入示例”可以载入示例表格；如果先勾选“双内参”，则会载入包含两个内参基因的示例。

如果某组技术重复 Ct 极差超过 `0.5`，页面会显示 warning 提示检查异常值；该提示不阻断分析，计算仍会使用技术重复平均 Ct。

如果对照组只有 1 个生物学重复，页面会显示 warning，并跳过 ANOVA 和 Welch t-test；此时结果只用于观察表达趋势。

## 计算方法

1. 每个样本先计算 `ΔCt = target Ct - reference Ct`
2. 对照组计算平均 `ΔCt`
3. 每个样本计算 `ΔΔCt = sample ΔCt - control mean ΔCt`
4. 相对表达量为 `2^-ΔΔCt`

单内参模式下，`reference Ct` 是所选内参基因 Ct。双内参模式下，`reference Ct` 是两个内参基因 Ct 的平均值。

统计检验在 `ΔCt` 尺度上进行：

- 非对照组 vs 对照组：Welch t-test
- 多组总体差异：one-way ANOVA

## 使用

打开：

```text
/data/user/mowp/workspace/qPCR_tools/index.html
```

页面内可以下载 SVG 图和结果 CSV。

页面摘要会展示样本数、组数、ANOVA p 和 `Control mean ΔCt`。

图表支持：

- 显示或隐藏样本数据点
- 显示或隐藏柱状图平均值
- 自定义对照组和处理组颜色
- 在 `Y = 1` 位置显示参考虚线
- 对照组固定排在最左侧
