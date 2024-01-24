import Vue from 'vue'
import App from './App.vue'
import store from './store/index'
Vue.config.productionTip = false

new Vue({
  // 将store实例注入到 vue 中==> 每个子组件，都会拥有一个属性$store
  store, 
  render: h => h(App),
}).$mount('#app')


