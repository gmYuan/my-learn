## DOM事件详解

## 一 事件流 与 事件模型

Q1 DOM中 绑定事件有多少种方式  

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
  - 特点2: 对应的事件模型是 冒泡/目标 阶段(关于事件模型内容，见下文)

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
Q2 什么是JS中的事件模型/ 什么是事件捕获和事件冒泡 

A: 所谓的事件模型，其实就是 `定义了DOM树形结构 事件回调执行顺序` 的规范

S1 当一个元素触发事件后，会形成事件流，把该事件在父子元素间进行传播，这种传播可以分为3个阶段:
  - 捕获阶段: 事件 从window对象 从外向内 到目标节点 传播的阶段
  - 目标阶段: 真正的目标节点 正在处理事件的 阶段
  - 冒泡阶段: 事件从目标节点 从内向外 到window对象 传播的阶段

即 事件流的过程是 `根节点==> 父节点==> 目标元素-目标元素 ==> 父节点==> 根节点`

S2 事件捕获模型：回调触发的 时机是在从 外==>内 的阶段 

S3 事件冒泡模型：回调触发的 时机是在从 内==>外 的阶段 

```js
// 例1 多个元素设置成 不同事件模型
parent.addEventListener('click', event => {
  console.log('父元素');
}, true);

child.addEventListener('click', event => {
  console.log('子元素');
}, false);

document.body.addEventListener('click', () => {
  console.log('body');
}, false);

// 当点击child节点时，输出顺序是: 父元素==> 子元素==> body

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
Q3 捕获阶段能终止吗 & 终止冒泡阶段有哪些方法

A: <br/>
S1 方法1: 可以通过 event.stopPropagation来中止事件的传播，即中止事件的 捕获/冒泡阶段的继续传播

S2 方法2: 通过 event.stopImmediatePropagation来 中止事件的传播
  - 不仅会阻止事件传播，还会阻止该元素上的 同类型事件的 其他回调

```js
// 例1 中止事件传播
parent.addEventListener('click', e => {
  console.log('父元素');
  e.stopPropagation() // 或者用 e.stopImmediatePropagation()
}, true);

parent.addEventListener('click', e => {
  console.log('父元素点击2');
}, true);

child.addEventListener('click', event => {
  console.log('子元素');
}, false);

document.body.addEventListener('click', () => {
  console.log('body');
}, true);

// e.stopPropagation + 点击child节点时，输出顺序是: body==> 父元素==>父元素点击2

// e.stopImmediatePropagation + 点击child节点时，输出顺序是: body==> 父元素
```

--------------------------------------------
Q4 event.target和event.currentTarget的区别

A: <br/>
S1 e.target: 值是 触发事件监听的对象，即「事件触发者」

S2 e.currentTarget: 值是 当前执行回调的监听对象,即「事件监听者」

```js
parent.addEventListener('click', e => {
  console.log('------');
  console.log('currentTarget:', e.currentTarget);
  console.log('target:', e.target);
});

child.addEventListener('click', e => {
  console.log('currentTarget:', e.currentTarget);
  console.log('target:', e.target);
});

// 当我们点击child元素，输出结果为：
// currentTarget: child
// target: child
// ------
// currentTarget: parent
// target: child
```

## 二 事件委托

Q1 什么是事件委托 + 它的使用场景 + 它的优缺点

A: <br/>
S1 事件委托是 利用事件模型的冒泡机制， 把多个子节点的监听函数定义在父节点上，用父节点的监听函数 统一处理 多个子元素事件的方法

S2 使用场景:
  - 有大量dom元素 需要添加事件监听 + 这些元素在运行时可能会动态 添加/删除
  - 支持对还未创建的元素 添加事件

S3.1 优点:
  - 减少内存消耗，提高性能：注册的事件回调是函数对象，函数对象越多所占内存就越大；
  - 便于 动态添加/删除元素的事件监听: 由于事件监听是在父元素上，所以即使动态添加或删除子元素，也无需重新绑定或解绑 事件监听器

S3.2 缺点:
  - 不适用于所有事件：并非所有的事件都会冒泡(如focus/blur/鼠标的滚动事件等)，这些事件无法使用事件委托
  - 在某些情况下可能会导致事件 在预期之外的时间触发

--------------------------------------
Q2 如何用JS实现 事件委托

A: <br/>

```html
<ul id="list">
  <li>1 <span>aaa</span></li>
  <li>2 <span>bbb</span></li>
  <li>3 <span>ccc</span></li>
  <!-- ....... -->
</ul>

<script>
// 给父层元素绑定事件
document.getElementById('list').addEventListener('click', function (e) {
  // 兼容性处理
  const event = e || window.event;
  const target = event.target || event.srcElement;
  // 判断是否匹配目标元素
  while(target.tagName !== 'LI'){
    if(target.tagName === 'UL'){
      target = null
      break;
    }
    target = target.parentNode
  }
  if (target) {
    console.log('你点击了ul里的li')
  }
});
```

## 三 其他事件相关内容

Q1 如何定义/实现一个 自定义事件

A: <br/>

1. 方法1: Event()构造函数
2. 方法2: CustomEvent()构造函数
3. 两者区别
  - Event() 适合创建简单的自定义事件
  - CustomEvent()支持携带自定义事件的 自定义参数

4. 使用场景
  - 本质上和观察者模式是相同的，所以能用观察者模式的场景，就可以用 自定义事件

```js
// 方法1: Event()构造函数
const myEvent = new Event(eventName = 'myEvent', eventOptions = {
  bubbles: false,     // 表示该事件是否冒泡
  cancelable: false,  // 表示该事件能否被取消
  composed: false,    // 表示事件是否会在shadow DOM根节点之外 触发侦听器
});

// 事件监听
window.addEventListener("myEvent", function(e) {
  console.log('自定义事件触发了')
})

// 事件触发: 事件可以在任何元素触发
elementDOM.dispatchEvent(myEvent);

// -------------------------------------
// 方法2: CustomEvent()构造函数
let myEvent = new CustomEvent(eventName = 'myEvent',  eventOptions = {
  detail: { name: 'abc' },  // 表示该事件中 传递的自定义数据
  bubbles: false,           // 表示该事件是否冒泡
  cancelable: false,        // 表示该事件能否被取消
});

// 添加事件监听
window.addEventListener("myEvent", e => {
  console.log(`自定义事件触发了，信息是${e.detail.name}`)
});

// 触发 自定义事件
element.addEventListener("click", function() {
    window.dispatchEvent(myEvent);
  }
)
```

-----------------------------------------
Q2 如何实现once绑定事件

A: <br/>

```js
// 实现方法1- 封装事件函数
function once(selector, eventType, callback) {
  selector.addEventListener(eventType, function fn(e) {
    e.target.removeEventListener(e.eventType, fn);
    return callback(e);
  }, false);
}
// 使用方法 once(button, 'click' , function(e){});

// 实现方法2- addEventListener的once选项
button.addEventListener('click', function (e) {}, {once: true} );
```

-----------------------------------------------------------
Q3 添加原生事件不移除为什么会内存泄露，还有哪些情况会存在内存泄漏

A: <br/>
这部分知识点和内存泄露强相关，后续会在内存泄露文章里进行介绍


## 四 React事件

Q1 React组件中如何实现 事件代理，简述 React的事件代理机制

A: <br/>



## 五 参考文档

[01 深入理解DOM事件机制](https://juejin.cn/post/6844903781969166349)

[02 JavaScript 自定义事件如此简单](https://juejin.cn/post/6844904069820055560)






说说React事件和原生事件的执行顺序
React 的事件代理机制和原生事件绑定有什么区别
React 的事件代理机制和原生事件绑定混用会有什么问题
React 中如果绑定事件使用匿名函数有什么影响