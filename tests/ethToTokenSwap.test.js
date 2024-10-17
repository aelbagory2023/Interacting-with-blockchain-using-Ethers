const { expect } = require('chai');
const ethers = require('ethers'); // Ensure ethers is available in your environment

describe('Token Swap Tests', function () {
    let tokenSwap, dai, user;

    before(async function () {
        // Initialize your provider and signer
        const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545'); // Adjust the provider as needed
        const wallet = ethers.Wallet.fromMnemonic('your mnemonic here').connect(provider); // Use your wallet

        user = wallet; // Set the user to the wallet

        // Deploy DAI mock contract
        const DAI = await ethers.getContractFactory('DAI', wallet);
        dai = await DAI.deploy();
        await dai.deployed();

        // Deploy TokenSwap contract
        const TokenSwap = await ethers.getContractFactory('TokenSwap', wallet);
        tokenSwap = await TokenSwap.deploy(dai.address);
        await tokenSwap.deployed();

        // Fund user with DAI for testing
        await dai.mint(user.address, ethers.utils.parseUnits('1000', 18)); // Mint 1000 DAI to user
    });

    it('should increase DAI balance after swap and match expected amount out', async function () {
        const initialDAIBalance = await dai.balanceOf(user.address);
        const amountInETH = ethers.utils.parseEther('0.1');

        // Assume user sends 0.1 ETH to the swap contract
        const tx = await tokenSwap.connect(user).swapETHForDAI({ value: amountInETH });
        const receipt = await tx.wait();

        const finalDAIBalance = await dai.balanceOf(user.address);
        const expectedAmountOut = await tokenSwap.getExpectedAmountOut(amountInETH); // Assuming you have a method to get expected amount out
        const actualAmountOut = receipt.events.find(event => event.event === 'SwapExecuted').args.amountOut; // Adjust based on your event structure

        // Check that DAI balance increased
        expect(finalDAIBalance).to.be.greaterThan(initialDAIBalance, "DAI balance did not increase as expected");

        // Check that actual amount out matches expected amount out
        expect(actualAmountOut).to.equal(expectedAmountOut, "Actual amount out does not match expected amount out");
    });

    it('should decrease ETH balance after swap', async function () {
        const initialETHBalance = await ethers.provider.getBalance(user.address);
        const amountInETH = ethers.utils.parseEther('0.1');

        // Assume user sends 0.1 ETH to the swap contract again
        const tx = await tokenSwap.connect(user).swapETHForDAI({ value: amountInETH });
        await tx.wait();

        const finalETHBalance = await ethers.provider.getBalance(user.address);

        // Check that ETH balance decreased
        expect(finalETHBalance).to.be.lessThan(initialETHBalance, "ETH balance did not decrease as expected");
    });
});
