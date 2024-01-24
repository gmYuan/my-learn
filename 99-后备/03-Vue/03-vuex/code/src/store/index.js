import Vue from "vue";
// import Vuex from "vuex";
import Vuex from "@/vuex";

import a from "./a.js";
import b from "./b.js";
// import logger from 'vuex/dist/logger'

function persists() {
  return function(store) {
    // store是当前默认传递的
    let data = localStorage.getItem("VUEX:STATE");
    if (data) {
      store.replaceState(JSON.parse(data));
    }
    store.subscribe((mutation, state) => {
      localStorage.setItem("VUEX:STATE", JSON.stringify(state));
    });
  };
}

// 注册vuex插件: 内部会调用Vuex中的install方法
Vue.use(Vuex);

// 实例化容器: Vuex.Store
const store = new Vuex.Store({
  plugins: [
    // logger(),  // vuex-persists
    persists(),
  ],

  // state 状态：相当于组件中的 data 数据
  state: {
    age: 10,
  },

  // getters: 相当于计算属性（内部实现利用了计算属性）
  getters: {
    myAge(state) {
      return state.age + 20;
    },
  },

  // 相当于method，能够同步的更改state
  mutations: {
    // mutation的参数是状态
    changeAge(state, payload) {
      state.age += payload; // 更新age属性
    },
  },

  // action作用: 执行异步操作，并将结果提交给 mutations
  actions: {
    changeAge({ commit }, payload) {
      setTimeout(() => {
        commit("changeAge", payload);
      }, 1000);
    },
  },

  modules: {
    a,
    b,
  },
});

export default store;
