export default {
  namespaced: true,
  state: {
    age: 200,
  },
  getters: {},
  actions: {},
  mutations: {
    changeAge(state, payload) {
      state.age += payload;
    },
  },
};
