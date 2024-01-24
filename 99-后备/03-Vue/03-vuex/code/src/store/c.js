export default {
  namespaced: true,
  state: {
    age: 300,
  },
  // getters: 相当于计算属性（内部实现利用了计算属性）
  getters: {
    myAge(state, getters, rootState, rootGetters) {
      console.log('dd1', state)
      return state.age + 20;
    },
  },
  actions: {},
  mutations: {
    changeAge(state, payload) {
      state.age += payload;
    },
  },
};
