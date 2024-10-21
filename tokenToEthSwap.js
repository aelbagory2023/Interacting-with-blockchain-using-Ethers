import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

// Set up provider and wallet
const provider = new ethers.JsonRpcProvider("https://base-mainnet.infura.io/v3/85e931233d114d1e9494915d56ec9d54");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Uniswap Router setup
const UNISWAP_ROUTER_ADDRESS = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24";
const UNISWAP_ROUTER_ABI = [
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];
const router = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, wallet);

// Token addresses
const DAI_ADDRESS = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// Amount to swap
const amountInDAI = ethers.parseUnits("10.2", 18); // 10 DAI

async function getBalances() {
  const ethBalance = await provider.getBalance(wallet.address);
  const daiContract = new ethers.Contract(DAI_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider);
  const daiBalance = await daiContract.balanceOf(wallet.address);
  return { eth: ethBalance, dai: daiBalance };
}

async function swapTokensForEth() {
  try {
    // Get balances before swap
    const balancesBefore = await getBalances();
    console.log(`ETH Balance Before: ${ethers.formatEther(balancesBefore.eth)} ETH`);
    console.log(`DAI Balance Before: ${ethers.formatUnits(balancesBefore.dai, 18)} DAI`);

    // Approve DAI spending
    const daiContract = new ethers.Contract(DAI_ADDRESS, ["function approve(address spender, uint256 amount) public returns (bool)"], wallet);
    await (await daiContract.approve(UNISWAP_ROUTER_ADDRESS, amountInDAI)).wait();

    // Get expected amount out
    const [, expectedAmountOut] = await router.getAmountsOut(amountInDAI, [DAI_ADDRESS, WETH_ADDRESS]);
    const amountOutMin = expectedAmountOut * BigInt(95) / BigInt(100); // 5% slippage tolerance

    // Perform swap
    const tx = await router.swapExactTokensForETH(
      amountInDAI,
      amountOutMin,
      [DAI_ADDRESS, WETH_ADDRESS],
      wallet.address,
      Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes deadline
      { gasLimit: 300000 }
    );
    const receipt = await tx.wait();

    // Get balances after swap
    const balancesAfter = await getBalances();
    console.log(`ETH Balance After: ${ethers.formatEther(balancesAfter.eth)} ETH`);
    console.log(`DAI Balance After: ${ethers.formatUnits(balancesAfter.dai, 18)} DAI`);

    // Calculate actual amount received
    const ethReceived = balancesAfter.eth - balancesBefore.eth;
    
    // Calculate slippage
    const slippage = (Number(expectedAmountOut - ethReceived) / Number(expectedAmountOut)) * 100;
    console.log(`Slippage: ${slippage.toFixed(2)}%`);

  } catch (error) {
    console.error(`Error occurred during swap: ${error.message}`);
  }
}

export { swapTokensForEth };
swapTokensForEth();