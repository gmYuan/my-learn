import vuex from ".";

export default function applyMixin(Vue) {
  // 父子组件的执行顺序: 
  //   - 父beforeCreate-> 父created -> 父beforeMounte ->
  //   - 子beforeCreate-> 子create ->子beforeMount ->子 mounted -> 
  //   - 父mounted

  Vue.mixin({
    // 内部会把生命周期函数 拍平成一个数组
    beforeCreate: vuexInit,
  });
}

function vuexInit() {
  // 给所有的组件增加$store属性,  指向我们创建的store实例
  const options = this.$options; // 获取用户所有的选项
  if (options.store) {  // 根实例
     // 为根实例添加 $store 属性，指向用户传入的 store实例
    this.$store = options.store;
  } else if (options.parent && options.parent.$store) {  //子实例
    // 在执行子组件的beforeCreate的时候，父组件已经执行完beforeCreate了
    // 所以 此时父组件已经有$store了
    // 所以 儿子可以通过父亲拿到$store属性，放到自己身上提供给 孙子组件
    this.$store = options.parent.$store;
  }
}
