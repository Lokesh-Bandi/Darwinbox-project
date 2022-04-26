const brain = require('brain.js');

const config = {
    binaryThresh: 0.5,
    hiddenLayers: [3], // array of ints for the sizes of the hidden layers in the network
    activation: 'relu', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
    leakyReluAlpha: 0.01, // supported for activation type 'leaky-relu'
  };

  const net = new brain.NeuralNetwork(config);

  var arr=[{"Needs Improvement":0},{"Fully Meets":1},{"Exceeds":2},{"PIP":3}]

  net.train([
    { input: [0], output: [3] },
    { input: [0], output: [3] },
    { input: [1], output: [3] },
    { input: [1], output: [3] },
  ]);

  const output = net.run([1]);

  exports.output=output