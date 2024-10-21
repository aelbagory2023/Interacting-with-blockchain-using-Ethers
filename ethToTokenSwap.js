import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

// Set up provider and wallet
const provider = new ethers.JsonRpcProvider(
  "https://base-mainnet.infura.io/v3/85e931233d114d1e9494915d56ec9d54"
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Uniswap Router setup
const UNISWAP_ROUTER_ADDRESS = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24"; // Uniswap V2 Router on Base
const UNISWAP_ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];
const router = new ethers.Contract(
  UNISWAP_ROUTER_ADDRESS,
  UNISWAP_ROUTER_ABI,
  wallet
);

// Token addresses
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // WETH on Base
const DAI_ADDRESS = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"; // DAI on Base

// Amount to swap
const amountInETH = ethers.parseEther("0.001"); // 0.001 ETH

async function getBalances() {
  const ethBalance = await provider.getBalance(wallet.address);
  const daiContract = new ethers.Contract(DAI_ADDRESS, [
    "function balanceOf(address) view returns (uint256)"
  ], provider);
  const daiBalance = await daiContract.balanceOf(wallet.address);
  return { eth: ethBalance, dai: daiBalance };
}

async function swapEthForTokens() {
  try {
    // Get balances before swap
    const balancesBefore = await getBalances();
    console.log(`ETH Balance Before: ${ethers.formatEther(balancesBefore.eth)} ETH`);
    console.log(`DAI Balance Before: ${ethers.formatUnits(balancesBefore.dai, 18)} DAI`);

    // Get expected amount out
    const [, expectedAmountOut] = await router.getAmountsOut(amountInETH, [WETH_ADDRESS, DAI_ADDRESS]);
    const amountOutMin = expectedAmountOut * BigInt(95) / BigInt(100); // 5% slippage tolerance

    // Perform swap
    const tx = await router.swapExactETHForTokens(
      amountOutMin,
      [WETH_ADDRESS, DAI_ADDRESS],
      wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
      { value: amountInETH, gasLimit: 300000 }
    );
    const receipt = await tx.wait();

    // Get balances after swap
    const balancesAfter = await getBalances();
    console.log(`ETH Balance After: ${ethers.formatEther(balancesAfter.eth)} ETH`);
    console.log(`DAI Balance After: ${ethers.formatUnits(balancesAfter.dai, 18)} DAI`);

    // Calculate actual amount received
    const daiReceived = balancesAfter.dai - balancesBefore.dai;
    
    // Calculate slippage
    const slippage = (Number(expectedAmountOut - daiReceived) / Number(expectedAmountOut)) * 100;
    console.log(`Expected DAI: ${ethers.formatUnits(expectedAmountOut, 18)} DAI`);
    console.log(`Actual DAI received: ${ethers.formatUnits(daiReceived, 18)} DAI`);
    console.log(`Slippage: ${slippage.toFixed(4)}%`);

  } catch (error) {
    console.error(`Error occurred during swap: ${error.message}`);
  }
}

export { swapEthForTokens };
swapEthForTokens();
