# CSS之 flex

## 实战篇

首先请尝试回答以下3个问题，如果都能回答的出，那么该文对您来说没有新的知识点，请避免浪费时间。

Q1 分别见下图1 和 图2，添加了什么属性后，就会破坏 parentflex-wrap: nowap的默认显示行为
![图1](https://gitee.com/ygming/blog-img/raw/master/img/flex1.png)
![图2](https://gitee.com/ygming/blog-img/raw/master/img/flex2.png)

Q2 分别见下图3和 图4，为什么给child1设置了flex:1 后，2个child1的宽度值反而变小了
![图3](https://gitee.com/ygming/blog-img/raw/master/img/flex3.png)
![图4](https://gitee.com/ygming/blog-img/raw/master/img/flex4.png)

Q3 见下图5，为什么parent设置了align-items: center后，子容器没有绝对居中
![图5](https://gitee.com/ygming/blog-img/raw/master/img/flex5.png)

## 理论篇

Q1 flex有那些属性值
A：
S1 分为 flex容器 和 flex项

S2 flex容器的属性值有：
  - flex-direction：用于 设置 主轴方向以及主轴的起止点
  - flex-wrap：设置 子容器超出父容器后，是否换行
  - flex-flow: flex-direction 和 flex-wrap 的简写形式，不赘述

  - justify-content：设置 主轴方向上 子容器的对齐方式
  - align-items：设置 交叉轴方向上 子容器的对齐方式
  - algin-content：设置 存在多行/列 主轴时，交叉轴方向上的 排列顺序 ( 只有一行主轴则不生效)


S3 flex项的属性值有：
  - order：设置 子项在容器主轴方向的 排列顺序，数值越小排列越靠前，默认值为 0
  - flex-basis: 设置 子项在主轴方向上的初始大小
  - flex-grow:  当主轴这一行/一列 剩余空间 > 0，设置 子项宽度/高度的 放大比例
  - flex-shrink: 当主轴这一行/一列 剩余空间 < 0，设置 子项宽度/高度的 缩小比例
  - flex: flex-grow, flex-shrink 和 flex-basis的简写，默认值是 flex: 0 1 auto

  - align-self: 设置 单个子项 在交叉轴的对齐方式

------
Q2 flex-wrap有哪些注意事项
A：
首先 列出以下几种场景
case1：flex-direction为row + flex-wrap: nowrap + 子容器宽度> 父容器宽度
case2：flex-direction为row + flex-wrap: wrap + 子容器宽度> 父容器宽度
case3：flex-direction为column + flex-wrap: nowrap + 子容器高度 > 父容器高度
case4：flex-direction为column + flex-wrap: wrap + 子容器高度 > 父容器高度
则
S1 case1时，子容器不换行 + 宽度会变小 (因为 flex-shrink默认值为1，具体见下文)
S2 case2时，子容器换行 + 宽度不会变小
S3 case3/4时，子容器的高度都不会变小 + case3时默认会超出容器高度；case4时则换列，不会超出容器高度

S4 flex-wrap: wrap-reverse 的含义是：子容器换行处理 + 交换/更改 主轴的 默认起止点

------
Q3 justify-content 有哪些注意事项
A：
S1 flex-direction为row时，只有在宽度存在多余空间时的那一行(主轴)，才会在视觉上生效
S2 flex-direction为coloumn时，不管 子容器高度是否大于 父容器高度，都会在视觉上生效

------
Q4 align-items 有哪些注意事项
A：
S1 当align-items: stretch时，如果子容器不定高，则默认 子容器高度总和等于父容器高度；如果子容器定高，则align-items: stretch不会生效

S2 一般情况下，父容器内只有一行/一列主轴时，适合 使用 align-items设置交叉轴排列方式；如果 父容器内有多行/多列 主轴时，则 适合使用 align-content

-----
Q5 flex-basis 有哪些注意事项
A：
S1 默认值为 auto，即子项原本的  width/height值

S2 当设置了flex-basis时，子项原本的宽度/高度值会失效，子项的 width/height值 = Math.Min(flex-basis值, 容器width/height值)

S3 flex-basis: 0时，该子项的 宽/高值，就是其内容的宽/高

--------
Q6 flex: 1 有哪些注意事项
A：

S1 flex-grow 默认值为0，即 如果存在剩余空间，该子项 也不放大；
flex-shrink 默认值为1，即 如果剩余空间不足，该子项 默认缩小;  flex-shrink:值为0时则 不缩小该子项

S2 flex值 简写含义
  - 当 flex: p (p>= 0)时，则等同为 flex: p(flex-grow)  1(flex-shrink)   0%(flex-basis)
  - 当 flex: y% 或者 ypx时，则等同为 flex: 1  1  y
  - 当 flex: p q (p >= 0，且 q >= 0)时，则等同为 flex: p  q  0%
  - 当 flex: p y%或者ypx (p >= 0)时，则等同为 flex: p  1  y

S3 flex-wrap值 和 flex-grow/flex-shrink关系
  - 当 flex-wrap为 wrap时， 不管 子项宽度和是否大于父容器宽度，flex-grow 都会生效
  - 当 flex-wrap 为 nowrap + 子项宽度和 < 父容器宽度时，flex-grow 会起作用
  - 当 flex-wrap 为 nowrap + 子项宽度和 > 父容器宽度时，flex-shrink 会起作用，特殊的，当这一行所有子项 flex-shrink都为0时，就会出现横向滚动条

S4 综上所述，在同一时间，flex-shrink 和 flex-grow 只有一个能起作用

-------
最后回答一下 一开始提出的3个 实战问题

问题1：因为nowrap时，每个子项的flex-shrink的默认值是1，所以设置了flex-shrink:0后，就会破坏默认结构

问题2: flex: 1 的效果等价为 flex: 1 1 0%，flex-basis: 0% 会导致子项宽度为内容宽度(小于一开始设置的100px)，再加上 flex-grow:1生效，就会在原有内容区的宽度基础上，加上父容器此时剩余的空间

问题3: 此时父容器内部有多个主轴，所以交叉轴分布方式，由align-content控制。虽然其默认值是stretch，但我们给子容器设置了定高，所以覆盖了stretch，就表现为这种居中样式


## 参考文档
01 [30 分钟学会 Flex 布局](https://zhuanlan.zhihu.com/p/25303493)

02 [MDN 弹性盒子布局](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Flexible_Box_Layout)