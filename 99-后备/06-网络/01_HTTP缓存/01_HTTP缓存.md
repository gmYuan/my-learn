## 一 什么是 HTTP缓存

1 含义：可以在本地 保存网络资源副本的 HTTP设备

2 缓存的应用对象：
  - 主要是 HTML/CSS/Img等 静态资源，因为它们不常改变
  - 一般不会去缓存 动态资源，因为缓存动态资源的话，数据的实时性不容易保障

3 HTTP缓存类型：
  - 强缓存：如果请求的目标资源A 命中强缓存，那么就可以直接从内存中读取A，与服务端无通信（即请求不会发送到服务端）
  - 协商缓存：请求还是会发送到服务端，与服务端有通信
  - 具体实现，见下文

## 二 HTTP缓存可以解决什么问题 + 缺点是什么

1 优点/作用/解决问题：
  - 网络方面：减少不必要的网络传输，节约网络带宽
  - 服务器方面：减少服务器负担，避免服务器过载
  - 客户端方面：提高 客户端的 加载速度

2 缺点：
  - 占内存：因为有些缓存 会被存到内存中
  - 耗费 服务端计算资源：主要是下文介绍的 ETag方法

## 三 强缓存的 实现

### 1 Expires字段

1 含义：
  - 服务器设置响应头字段 `Expires: 星期, 日 月 年 时分秒 GMT`(如 Fri, 01 Jan 1990 00:00:00 GMT)
  - 即设定1个时间戳，在此时间前，就都从内存/磁盘内读取资源缓存，不会发送请求到服务器

2 伪代码实现：

```js
// 强缓存方法1: Expires
res.setHeader( 'Expires', new Date( Date.now() + N * 1000 ).toGMTString() )
```

3 Expires缺点：
  - 比较的时间戳是 本地时间戳，这就意味着 Expires过度依赖本地时间
  - `如果本地时间 与 服务器时间不同步`，就会出现资源 无法被缓存/ 资源永远被缓存的情况
  - 所以 Expires字段几乎不被使用，而被HTTP1.1引入的 cache-control字段所代替


### 2 cache-control字段

1 cache-control响应头字段 取值类型/含义：

S1 max-age = N: 
  - N就是需要缓存的秒数/ max-age的时长单位为 秒
  - 时间的计算起点是 响应报文的创建时刻（即 Date字段，也就是离开服务器的时刻），而不是 客户端收到报文的时刻，也就是说 包含了在链路传输过程中 所有节点所停留的时间
  - 由于它是一个根据服务器当前时间的 相对时间，也就不需要比对客户端和服务端的时间，从而 解决了Expires所存在的巨大问题
  - max-age=0表示 不使用缓存，请求最新数据，类似于 "no-cache"的效果
    
S2 s-maxage: 表示资源在代理服务器的 缓存时长，它必须和public属性一起使用，如 `cache-control: max-age=10000,s-maxage=200000,public`

S3 no-cache: 表示 该资源会直接跳过强缓存校验，直接去服务器进行协商缓存

S4 no-store: 表示 禁止使用任何缓存策略，即不使用强缓存/协商缓存

S5 public: 表示 资源既可以被浏览器缓存，也可以被代理服务器缓存
  - 浏览器请求服务器时，如果缓存时间未过期，中间服务器直接返回给浏览器内容，而不必请求源服务器

S6 private: 表示 资源只能被浏览器缓存


代理作为服务器 ==> 向客户端转发响应时的 缓存设置： <br/>
S7 must-revalidate: 如果缓存不过期就可以继续使用；但过期了 就必须回 源服务器验证

S8 proxy-revalidate: 只要求代理的缓存过期后必须向源服务器验证，客户端不必回源服务器

S9 no-transform：代理专用属性，禁止代理对资源做 转化处理

用图表示代理服务器作为响应端的 cache-control流程
![代理服务器作为响应端的cache-control流程图](./%E4%BB%A3%E7%90%86%E6%9C%8D%E5%8A%A1%E5%93%8D%E5%BA%94%E7%AB%AFcache-conrol.png)


2 伪代码实现：

```js
// 强缓存方法2: cache-control
res.setHeader( 'cache-control', 'max-age=N' )
```

3 其他：
  - cache-control的优先级高于 Expires;
  - 强制缓存的状态码为 200 + 存储位置为 Disk Cache 和 Memory Cache;
  - 浏览器 F5"刷新": 相当于在请求头自动加上 Cache-Control: no-cache；
  - Ctrl+F5 "强制刷新": 相当于发送 "Cache-Control: no-store"


### 3 强缓存内容小结

1 强缓存的实现流程，用图表示为

![强缓存流程图](./%E5%BC%BA%E7%BC%93%E5%AD%98%E6%B5%81%E7%A8%8B.png)

2 强缓存的缺点：
  - 如果缓存文件A 内容发生了变化 + 缓存还未过期时，资源A 无法获取到最新内容 ==> `资源内容的 实时性问题`
  - 在强缓存时间到期时，有可能A的内容并未发生变化，这时候其实也希望能使用 "缓存机制"==> `缓存的 继续时效性问题`

所以，HTTP还引入了【协商缓存】的方式


## 四 协商缓存的 实现

### 1 last-modified字段

1 实现流程：

S1 第1次 发送请求==> 服务器返回 响应头last-modified字段 + 响应头cache-control

S2 第2次 发送请求==> 客户端携带 请求头if-modified-since(其值计做A) + 服务器获取时间A + 再次读取文件修改时间B + 把A和B进行比较==>
  - 时间对比成功，文件未被修改：返回304状态码
  - 时间对比失败，文件被修改：返回新资源文件 + 重新设置last-modified

用图表示为：

![last-modified流程](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8c2aa6e075f143ff89da0f049d07990d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp?)

2 伪代码实现：

```js
// 协商缓存方法1: Last-Modified
const data = fs.readFileSync() // 获取资源内容

// S1 读取 文件的最后修改时间
const { mtime } = fs.statSync(resource) 
// S2 读取 之前返回给客户端的文件修改时间
const ifModifiedSince = req.headers['if-modified-since']
// S3 比较文件修改时间B 和 请求传递的修改时间A 的时间是否一致
if (ifModifiedSince === mtime.toGMTString()) {
  // S4.1 如果一致，说明未被修改过==> 返回304
  res.statusCode = 304
  // 因为缓存已经生效，所以不需要返回资源data + 
  // 直接return结束，避免返回新的last-modified请求头
  res.end()
  return 
}
// S4.2 如果不一致，说明文件资源已被修改过==> 

//S4.2.1 设置文件 最后修改时间
res.setHeader('last-modified', mtime.toGMTString())
//S4.2.2 设置需要 强制进行协商缓存
res.setHeader('cache-control','no-cache')
res.end(data)
```

3 last-modified & if-modified-since 的缺点
  - 当资源内容修改后又撤销，这时文件内容实质没有发生变化，但还是会 更新last-modified值 ==> 实质内容没有变，但是修改时间还是发生变化了；
  - 文件修改时间记录的最小单位是秒, 不能识别1s内的资源内容 发生了变化,  所以不会更新last-modified值==> 无法监控到 1s之内文件内容的变化

因此，从http1.1开始新增了 ETag头字段


### 2 ETag字段

1 含义：
  - ETag的字段值是 一个根据文件内容生成的唯一哈希值，即所谓的`文件指纹`
  - 只要资源文件的内容发生了改变，那么 对应的哈希值也会发生改变
  - Etag 的优先级高于 Last-Modified
  - 协商缓存的状态码为 304

2 实现流程：

S1 第1次 发送请求==> 服务端读取文件，计算出文件指纹值(计作A) + 设置响应头字段 Etag: A + 返回文件资源给客户端

S2 第2次 发送请求==> 
  - 客户端自动从缓存中读取ETag的值A + 设置请求头字段if-None-Match: A 
  - 服务端拿到请求头中的if-None-Match字段值(A) + 再次读取目标资源并生成文件指纹B，两个指纹A、B间进行对比
  - A === B: 说明文件没有被改变==> 直接返回304状态码
  - A !== B: 说明文件被更改==> 把新的文件指纹B 存储到响应头的ETag中

用图表示为: <br/>
![e-tag流程](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f61c73437d244ff08d66f1b66b5ae178~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp?)

3 伪代码实现：

```js
if(req.url = xxx){
  // 协商缓存方法2: ETag
  const data = fs.readFileSync(bg2png); //读取资源 
  // S1 根据文件 生成唯一标识符
  const etagContent = etag(data);
  // S2 获取请求头中的 上一次的文件指纹
  const ifNoneMatch= req.headers[if-none-match];

  // S3 比较文件指纹是否一致
  if(ifNoneMatch === etagContent){
    // 文件指纹一致，返回304状态码
    res.statusCode =304; 
    res.end();
    return;
  }
  // 不一致，则设置响应头
  res.setHeader("etag", etagContent);
  res.setHeader("cache-control", "no-cache");
  res.end(data);
}
```

4 ETag的缺点

S1 ETag需要 服务端计算文件指纹，如果文件大数量多，就会影响服务器的性能；

S2 ETag 又可以分为 强验证/弱验证：
  - 强验证: ETag生成的哈希码 依赖文件内容的每个字节==> 非常消耗计算量
  - 弱验证: 在值前有个"W/"标记，它提取文件的 部分属性来生成哈希值==> 整体速度较快，但是准确率不高


## 五 缓存的使用场景

1 适合设置强缓存的资源：有哈希值的文件
  - 如图片、css文件、js文件
  - 因为只要我们重新打包生产新的哈希值，就相当于更改了文件的文件名，它就是一个新的文件，新文件不会受到 旧文件的强缓存影响

2 适合设置协商缓存的资源：没有哈希值的文件(如index.html)
  - 无法通过更改文件名称来“避开”强缓存的文件，一般都使用协商缓存

3 整个缓存的使用流程为

![整个缓存流程](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/10/171fea0fec0b4668~tplv-t2oaga2asx-zoom-in-crop-mark:4536:0:0:0.image)



## 参考文档

[01 中高级前端工程师都需要熟悉的技能--前端缓存](https://juejin.cn/post/7127194919235485733): 直接参考文档，推荐阅读

[02 为什么第二次打开页面快？五步吃透前端缓存，让页面飞起](https://juejin.cn/post/6993358764481085453): 内容很全面

[03 图解HTTP缓存](https://juejin.cn/post/6844904153043435533): 流程图还可以

[04 透视HTTP协议- 20～22小节](/)