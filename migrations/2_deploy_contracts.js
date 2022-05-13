const Leaders = artifacts.require("Leaders");

module.exports = function (deployer) {
    deployer.deploy(Leaders);
};
