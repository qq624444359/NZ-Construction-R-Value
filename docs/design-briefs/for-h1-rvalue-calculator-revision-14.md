> **这是什么**：给 Claude Design 的**第十四轮**改稿 prompt，只有一件事：
> **剖面图换成第十三轮给的 `eaves-section.js`，不要再用自己画的那一张。**
>
> 作者在 v5 的剖面图上又挑出四个问题——fascia 顶穿出屋面、上下弦颜色不一样、
> 保温不是保温的画法、抬高 heel 之后没有竖向木料。这四个在 `eaves-section.js` 里
> **已经都是对的**（保温符号这一轮刚加上）。继续在手画的 SVG 上补，只会再挑出第五个。

---

# 粘贴给 Claude Design 的说明 —— R-value Configurator 第十四轮

`rvc-v5-section.js` 里手画的那张剖面图**整个删掉**，换成第十三轮给的
`eaves-section(state)`。第十三轮说明里的状态映射、`data-layer` 分组、样式表照旧。

作者这次挑出的四个问题，在这段代码里是这样解决的：

## 1. Fascia 顶不再穿出屋面

fascia 顶面现在**跟着屋面走**：

- Longrun：fascia 顶 = 屋面板底面（上弦顶 + 檩条高 ÷ cos 坡度），屋面板正好落在 fascia 上
- Shingle：fascia 顶 = ply 底面往下 10 mm，那 10 mm 就是进气缝

所以 fascia 既不会穿出屋面，也不会和屋面之间空一道缝。soffit 跟着 fascia 底走。

## 2. 上弦、下弦、heel 竖杆是同一种木料

三者都用 `beyond timber` 一个 class——它们是同一榀桁架，在切面后面，颜色必须一样。
和切到的木料（top plate、extra top plate、檩条、battens）区分开：切到的用实线边框，
后面的用虚线边框。

**不要给上弦和下弦分配不同的颜色。**

## 3. 保温用保温棉的符号

保温的填充换成环形符号（就是手画剖面里那种连续的圈），代码里是
`<pattern id="es-batt">`，CSS：

```css
.eaves-section .insulation { fill: url(#es-batt); stroke: var(--insulation); stroke-width: 3; }
.eaves-section .batt { fill: none; stroke: var(--insulation); stroke-width: 4; }
```

符号是**透明背景**的，所以后面那榀桁架的轮廓透过保温还能看见——这正是剖面该有的读法：
保温在前，木架在后。

## 4. 抬高 heel 一定画出竖向木料

`heelHeight` 大于标准值时，代码在墙外皮处画一根 90 mm 宽的竖杆，从下弦顶面顶到上弦下沿，
和上下弦同色。标准 heel 时没有这根杆——因为真实构造里也没有。

注意：heel 抬得高、保温又铺满的时候，这根杆大部分被保温挡住，只露出顶上一小段。
这是对的，不要为了"看得见"把保温画短。

## 5. 檐口带从竖向木料的外缘起算

⑥ 的 500 mm 檐口带，起点是**墙骨架的外缘**，不是天花板的内边——保温棉可以铺在木料
之间，那部分也在檐口带里。图上的括线和 `Depth` 尺寸线都改到了这个位置，面板上的文案
改成 `500 mm from the outside face of the framing`。

后端 `perimeter_depth()` 本来就是从这个位置量的，所以两边现在一致，不用改计算。

## 6. 缩略图上不显示文字

剖面图在右栏只有 500 px 宽，标签字太小根本读不了，还把图挤成了原来的三分之一。
所以 `eavesSection` 新增 `labels` 参数，**默认 `false`**：

- **缩略图（默认）**：没有任何文字、引线、尺寸标注，画幅只框住构造本身，图放大了一倍多。
  尺寸线、檐口带的括线也一起去掉了（没有数字的尺寸线没有意义）；被压段的橙色底和
  顺坡的气流箭头保留——它们是图形，不是标注。檐口进气那支箭头也删了，一支顺坡箭头
  已经说清了气流方向
- **放大视图**：鼠标停 3 秒放大时，传 `labels: true` 重新生成，这时才出标签、尺寸和
  `EAVES · OUTSIDE` 字样

```js
panel.innerHTML = eavesSection(state);                              // 缩略图
zoomPanel.innerHTML = eavesSection(Object.assign({}, state, { labels: true }));  // 放大
```

层的名字由左栏的行负责，图上只管画；悬停某一行时图上对应部位高亮，这个联动不受影响。
屋顶空腔现在是一块极淡的色块（`.roofspace-fill`），这样没有文字时它也能被高亮。

## 7. 不要做的事

1. 不要保留任何手画的剖面 SVG
2. 不要改 `eaves-section.js` 里的几何——发现画得不对，告诉我，我改代码
3. 不要给桁架的不同杆件用不同颜色
4. 保温不要用色块或斜线，用环形符号
5. 缩略图上不要加任何文字，要看名字就放大
6. 环形符号**不要上下重复排列**——每一层只有一行，按自己的厚度拉长
   （代码给每一层生成一个 `es-batt-<层名>` pattern，线宽会补偿缩放，粗细保持一致）
