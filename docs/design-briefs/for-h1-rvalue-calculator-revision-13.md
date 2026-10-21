> **这是什么**：给 Claude Design 的**第十三轮**改稿 prompt。剖面图**不再让 Design 画**。
>
> **为什么换做法**：前几轮用文字描述结构，Design 每次都画错。v5 的剖面图里：
> 上弦悬空、没有落在下弦上；下弦只剩一行 "truss beyond" 的小字；longrun 屋面画成了
> 波浪线；heel 是一根和墙线分离的柱子。这些不是配色或排版的问题，是**结构关系错了**。
> 在一个算构造 R 值的工具里，示意图画错了结构，用户就不会信下面的数字。
>
> 所以这次我直接写了出图代码：[`assets/eaves-section.js`](assets/eaves-section.js)。
> 每一条线都是按真实毫米尺寸算出来的位置，结构关系由几何保证，不靠目测。
> [`assets/eaves-section-preview.html`](assets/eaves-section-preview.html) 可以直接打开，
> 切换屋面、坡度、heel、保温层来核对。
>
> **用法**：把 `eaves-section.js` 的**全部内容**和下面的说明一起粘进 Design。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第十三轮

## 一、剖面图改用这段代码生成，不要再手画

右栏 `Section · eaves` 面板里的 SVG，**全部删掉**，换成下面这个函数的输出：

```js
panel.innerHTML = eavesSection(state);
```

`eavesSection` 的代码附在本说明末尾，**原样放进项目**（例如 `js/eaves-section.js`），
不要改里面的坐标、尺寸和几何计算。如果觉得哪里画得不对，**告诉我，不要在 SVG 里修**——
改了坐标，图和计算就对不上了。

### 这段代码保证的结构关系

剖面是**在两榀桁架之间切开**、看向后面那一榀：

- **切到的（实线、实填充）**：屋面、underlay、檩条或 ply、ceiling battens、天花板、
  墙骨架、top plate、extra top plate、fascia、soffit、保温
- **看到的（虚线轮廓）**：后面那一榀桁架——上弦、下弦、抬高 heel 时的竖杆

具体位置：

1. 墙骨架 90 × 45 → 上面 **top plate 90 × 45** → 上面 **extra top plate 135 × 35**
   （向室内多伸出 45 mm）
2. **下弦坐在 extra top plate 上**，外端和墙外皮齐平
3. extra top plate 和 **ceiling battens 在同一高度**（都是 35 mm 厚），天花板从两者下面
   一起通过
4. 标准 heel：**上弦下沿在墙外皮处正好落在下弦上沿**；抬高 heel 时，中间多一根竖杆
5. 上弦一直伸到檐口，端头竖切，外面是 fascia，fascia 底下是 soffit 回到墙外皮
6. **Longrun**：檩条坐在上弦上 → roof paper 搭在檩条上、在两根之间下垂 → 屋面板压在
   檩条上。**剖面顺着坡度切，和屋面板的肋平行，所以屋面板是一条直线**，上面一道虚线
   表示肋高——不是波浪线。气流画在屋面板和 roof paper 之间
7. **Shingle**：15 mm ply 直接钉在上弦上 → D226+ → shingle，三层贴合。fascia 顶比 ply
   底低 10 mm 留进气缝，气流沿 ply 下表面往上
8. 保温铺在两榀之间：下层从下弦底面起（battens 上面），上层叠在下层上。**碰到屋面就被
   截住**，被压的那一段用淡橙色标出来

### heel 高度的定义

按 BRANZ 的图示量：**在墙外皮处，从下弦顶面量到上弦顶面**，即
`heel height = D ÷ cos θ − bird's mouth`（D 是上弦截面高度）。桁架没有 bird's mouth，
所以标准 heel = 上弦高 ÷ cos(坡度)，90 mm 上弦在 20° 是 **96 mm**；填得比它大就是
抬高 heel，中间多一根竖杆。

保温从**下弦底面**开始铺，所以墙边保温能用的深度 = **下弦高 + heel height**。
图上檐口那条尺寸线就是这样量的。

UI 里 `HEEL HEIGHT` 字段按这个定义：默认显示标准值（随上弦尺寸和坡度变），字段下方
说明改成 `Top of bottom chord to top of top chord, at the outside face of the wall`。

### ⑥ Roof perimeter 面板的数字随之更正

第八轮给的示例数字（95.8 mm / 492 mm）漏算了下弦之间那 90 mm。同一组构造
（20° 坡、90 × 90 桁架、标准 heel、275 mm 保温、500 mm 檐口带）更正为：

| | 墙线处深度 | 檐口带内边深度 | 全厚起点 | 被压范围 |
|---|---|---|---|---|
| Longrun（vent 0） | **185.8 mm** | 367.8 mm | 245 mm 处 | 245 / 500 |
| Shingle（vent 25） | **160.8 mm** | 342.8 mm | 314 mm 处 | 314 / 500 |

面板上把 `Depth at the wall line` 的说明写成 `Bottom chord depth + heel height −
vent gap`，让用户看得出这个数是怎么来的。

## 二、UI 状态怎么传进去

| UI | 传给 `eavesSection` |
|---|---|
| ① Longrun / Shingle | `roofing: 'longrun' \| 'shingle'` |
| 坡度 | `pitch` |
| Timber truss size（锁定时上下弦同值） | `topChord: { depth }`, `bottomChord: { depth }` |
| Heel height | `heelHeight`（留空 = 标准 heel） |
| Spacing / 檩条 | `purlin: { width, depth, spacing }` |
| ⑤ battens | `battens: { width, depth, spacing }` |
| 保温层列表 | `insulation: [{ layer: 'between' \| 'over' \| 'notched', label, thickness }]`，从下往上 |
| Between the battens | `battenCavity: { label, thickness }` 或 `null` |
| ⑥ perimeter 面板打开 | `perimeter: true`，`stripWidth` |
| ⑥ Vent gap | `ventGap`（留空 = longrun 0 / shingle 25） |

任何一个输入变化，**整张图重新生成**。不要做局部动画去"移动"某一层——第十二轮说的
淡入高亮，改成：重新生成后，给新出现的那个 `data-layer` 组加 1.5 秒 `--brand` 描边。

## 三、`data-layer` 组

代码输出的每个部件都在 `<g data-layer="...">` 里，悬停联动直接用：

`roofing` · `underlay` · `substrate` · `ventilation` · `chord` · `wall` · `eaves` ·
`insulation-between` · `insulation-over` · `insulation-notched` · `insulation-battens` ·
`battens` · `lining` · `perimeter` · `roofspace`

标签和引线也在对应的组里，所以高亮一层时它的文字一起亮。
新增的 `wall`（墙骨架和两道 top plate）、`eaves`（fascia、soffit、gutter）没有对应的
左栏行，悬停图上时只高亮自己。

## 四、样式

代码只输出 class，颜色由页面 CSS 决定。用我们的 token 写这些 class
（`eaves-section-preview.html` 里有一份可以直接参考的写法）：

| class | 画的是什么 | 建议 |
|---|---|---|
| `.cut.timber` / `.cut.x` | 切到的木料 | 木材色填充 + `--ink` 描边 |
| `.beyond` | 后面那榀桁架 | 暗木色填充，虚线描边 |
| `.beyond-outline` | 桁架轮廓（压在保温上面） | 无填充，木材色虚线 |
| `.cut.lining` / `.cut.ply` | 天花板、soffit、ply | 浅灰 / 木材色 |
| `.insulation` | 保温 | 填充 `url(#es-batt)`（保温棉的环形符号）+ 保温色描边 |
| `.batt` | 环形符号的线 | `fill: none`，保温色描边 |
| `.squashed` | 被压的那一段 | 橙色，约 18% 不透明 |
| `.sheet` / `.sheet-rib` | 屋面板 / 肋高虚线 | 浅灰粗线 / 细虚线 |
| `.underlay` / `.underlay.solid` | roof paper（虚线）/ D226+ | `--ink` |
| `.shingles` `.gutter` `.edge` | | `--ink-3` / 浅灰 |
| `.air` / `.air-head` | 气流箭头 | 蓝色 |
| `.leader` `.leader-dot` `.label` `.note` `.caption` | 标签 | `--ink` / `--ink-3` |
| `.dim` `.dimtext`（`.strong` 用保温色） | 尺寸线 | `--ink-3` |
| `.roofspace-fill` | 屋顶空腔 | 极淡的填充，无描边 |

浅色和深色主题都只改 token，不改代码。

## 五、尺寸

图带左右两列标签，宽高比约 3 : 1。放在右栏 520 px 宽时字会小，所以：

- 保留"鼠标停 3 秒放大"，放大时占两栏宽
- 右栏宽度允许的话，剖面图面板优先拿满宽

## 六、不要做的事

1. 不要自己画剖面图，也不要改 `eavesSection` 里的几何
2. 不要把 longrun 屋面画成波浪线
3. 不要把桁架画成切到的实心构件——它在切面后面
4. 不要用局部动画移动图里的层，状态变了就整张重新生成

---

（下面粘贴 `eaves-section.js` 全文）
