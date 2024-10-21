import { expect } from 'chai';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { swapEthForTokens } from '../EthToTokenSwap.js';


dotenv.config();

describe('ETH to DAI Swap Tests', function () {
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
            "function balanceOf(address) view returns (uint256)"
        ], wallet);

        // Set up Uniswap Router contract
        router = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, [
            "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
            "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
        ], wallet);
    });

    it("should swap ETH for DAI and calculate slippage correctly", async function () {
        const amountInETH = ethers.parseEther("0.001"); // 0.001 ETH

        // Get initial balances
        const initialDAIBalance = await daiContract.balanceOf(wallet.address);
        const initialETHBalance = await provider.getBalance(wallet.address);

        // Get expected amount out
        const [, expectedAmountOut] = await router.getAmountsOut(amountInETH, [WETH_ADDRESS, DAI_ADDRESS]);
        const amountOutMin = expectedAmountOut * BigInt(95) / BigInt(100); // 5% slippage tolerance

        // Perform the swap
        const tx = await router.swapExactETHForTokens(
            amountOutMin,
            [WETH_ADDRESS, DAI_ADDRESS],
            wallet.address,
            Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
            { value: amountInETH, gasLimit: 300000 }
        );
        await tx.wait();

        // Get final balances
        const finalDAIBalance = await daiContract.balanceOf(wallet.address);
        const finalETHBalance = await provider.getBalance(wallet.address);

        // Calculate actual amount received
        const daiReceived = finalDAIBalance - initialDAIBalance;

        // Calculate slippage
        const slippage = (Number(expectedAmountOut - daiReceived) / Number(expectedAmountOut)) * 100;

        // Assertions
        expect(finalDAIBalance).to.be.greaterThan(initialDAIBalance, "DAI balance did not increase as expected");
        expect(finalETHBalance).to.be.lessThan(initialETHBalance, "ETH balance did not decrease as expected");
        expect(slippage).to.be.at.least(0); // Adjust this based on your slippage tolerance
    });
});
