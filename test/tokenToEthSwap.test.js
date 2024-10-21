import { expect } from 'chai';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { swapTokensForEth } from '../tokenToEthSwap.js';

dotenv.config();

describe('Token to ETH Swap Tests', function () {
    let provider, wallet, router, daiContract;
    const UNISWAP_ROUTER_ADDRESS = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24"; // Uniswap V2 Router on Base
    const DAI_ADDRESS = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"; // DAI on Base
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // WETH on Base

    before(async function () {
        // Set up provider and wallet
        provider = new ethers.JsonRpcProvider("https://base-mainnet.infura.io/v3/85e931233d114d1e9494915d56ec9d54");
        wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        // Set up DAI contract
        daiContract = new ethers.Contract(DAI_ADDRESS, [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) public",
            "function mint(address to, uint256 amount) public"
        ], wallet);

        // Mint some DAI for testing
        await daiContract.mint(wallet.address, ethers.utils.parseUnits("1000", 18)); // Mint 1000 DAI to wallet

        // Set up Uniswap Router contract
        router = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, [
            "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
            "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
        ], wallet);
    });

    it("should swap DAI for ETH and calculate slippage correctly", async function () {
        const amountInDAI = ethers.utils.parseUnits("100", 18); // 100 DAI

        // Get initial balances
        const initialDAIBalance = await daiContract.balanceOf(wallet.address);
        const initialETHBalance = await provider.getBalance(wallet.address);

        // Approve the router to spend DAI
        await daiContract.approve(UNISWAP_ROUTER_ADDRESS, amountInDAI);

        // Get expected amount out
        const amountsOut = await router.getAmountsOut(amountInDAI, [DAI_ADDRESS, WETH_ADDRESS]);
        const expectedAmountOut = amountsOut[1]; // The second amount is the expected output (ETH)
        const amountOutMin = expectedAmountOut * 0.95; // 5% slippage tolerance

        // Perform the swap
        const tx = await router.swapExactTokensForETH(
            amountInDAI,
            ethers.utils.parseUnits(amountOutMin.toString(), 18), // Convert to BigNumber
            [DAI_ADDRESS, WETH_ADDRESS],
            wallet.address,
            Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
        );
        await tx.wait();

        // Get final balances
        const finalDAIBalance = await daiContract.balanceOf(wallet.address);
        const finalETHBalance = await provider.getBalance(wallet.address);

        // Calculate actual amount received
        const ethReceived = finalETHBalance - initialETHBalance; // Use subtraction directly

        // Calculate slippage
        const slippage = (Number(expectedAmountOut) - Number(ethReceived)) / Number(expectedAmountOut) * 100;

        // Assertions
        expect(finalDAIBalance).to.be.lessThan(initialDAIBalance, "DAI balance did not decrease as expected");
        expect(finalETHBalance).to.be.greaterThan(initialETHBalance, "ETH balance did not increase as expected");
        expect(slippage).to.be.at.least(0); // Adjust this based on your slippage tolerance
    });
});
