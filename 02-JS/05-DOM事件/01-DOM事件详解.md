## DOM事件详解

## 一 事件流 与 事件模型

Q1 什么是JS中的事件模型/ 什么是事件捕获和事件冒泡 

A: 所谓的事件模型，其实就是 `定义了DOM树形结构 事件回调执行顺序` 的规范

S1 当一个元素触发事件后，会形成事件流，把该事件在父子元素间进行传播，这种传播可以分为3个阶段:
  - 捕获阶段: 事件 从window对象 从外向内 到目标节点 传播的阶段
  - 目标阶段: 真正的目标节点 正在处理事件的 阶段
  - 冒泡阶段: 事件从目标节点 从内向外 到window对象 传播的阶段

即 事件流的过程是 `外==> 内==> 目标元素-目标元素 ==> 外`

S2 事件捕获模型：回调的 执行顺序是 外==>内 (window对象==> document对象==> html元素==> body元素==> 目标元素==> ....==> window对象)

S3 事件冒泡模型：回调的 执行顺序是 内==>外


```js
// 例1 多个元素设置成 不同事件模型
parent.addEventListener('click', event => {
  console.log('父元素点击了');
}, true);

child.addEventListener('click', event => {
  console.log('子元素点击了');
}, false);

document.body.addEventListener('click', () => {
  console.log('body被点击了');
}, false);

// 当点击child节点时，输出顺序是: 父元素==> '子元素==> body


// 例2 1个元素设置成 不同事件模型
element.addEventListener('click', function(){
  console.log('捕获阶段');
}, true); // 注意这里的 true，表示在捕获阶段处理

// bind bubble event
element.addEventListener('click', function() {
  console.log('冒泡阶段');
}, false); // 注意这里的 false，表示在冒泡阶段处理

// 当点击element元素时，输出顺序是: 捕获阶段==> 冒泡阶段

```

----------------------------------------------------
Q2 DOM中 绑定事件有多少种方式  

A: 根据规范制定的不同 DOM事件级别，有3种方法绑定事件

S1 方法1: DOM 0级事件之前 定义的方法: 在DOM元素中直接绑定事件，不推荐使用
  - 优点: 不需要获取/操作DOM 来完成事件的绑定
  - 缺点: HTML与JS逻辑 强耦合

```html
<!-- 示例1 值是JS代码/函数调用 -->
<div onclick="alert('我是方法1')" />

<div onclick="cb()" />

```

S2 方法2: DOM 0级事件规定的 事件绑定方法: element.onxxx (注意不是驼峰写法)
  - 特点1: 不支持为同一个元素/标签 绑定多个同类型事件 (只会执行最后一个绑定回调)
  - 特点2: 对应的事件模型是 冒泡/目标 阶段

```js
// 示例2
const btn = document.getElementById('btn');
btn.onclick = function(){
  alert('方法1');
}
```

S3 方法3: DOM 2级事件规定的 绑定方法: element.addEventListener
  - 特点1: 同一元素 支持绑定多个 同类型的事件回调

```js
// 示例3
const btn = document.getElementById('btn');
// 第三个可选参数[useCapture]作用是: 是否 是在事件捕获阶段 执行回调
btn.addEventListener('click', (e)=> cb(e), false);

// 解绑事件 方法
// btn.removeEventListener('click', fn, false);  

// PS：IE9以下的 IE浏览器不支持 addEventListener，需要使用 attachEvent/ detachEvent
```

PS: DOM 3级事件添加了更多的事件类型，如: 焦点事件/键盘事件/ 自定义事件等 


----------------------------------------------------
Q3 捕获阶段能终止吗 & 终止冒泡阶段有哪些

A: 









如何实现one绑定事件



写一个自定义事件、 用原生 js 实现自定义事件
事件委托的原理
用 JavaScript 代码实现事件代理
什么是事件代理，以及它的应用场景有哪些
介绍事件代理以及优缺点，主要解决什么问题

添加原生事件不移除为什么会内存泄露，还有哪些地方会存在内存泄漏

event.target和event.currtager的区别
移动端的点击事件的有延迟，时间是多久，为什么会有？ 怎么解决这个延时


React 组件中怎么做事件代理？它的原理是什么
简述下 React 的事件代理机制
说说React事件和原生事件的执行顺序
React 的事件代理机制和原生事件绑定有什么区别
React 的事件代理机制和原生事件绑定混用会有什么问题
React 中如果绑定事件使用匿名函数有什么影响


## 





## 四 参考文档

[01 todo](todo)



