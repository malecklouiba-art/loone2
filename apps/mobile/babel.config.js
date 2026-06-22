module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Doit rester en DERNIER.
      "react-native-reanimated/plugin",
    ],
  };
};
