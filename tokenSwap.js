const { ethers } = require("ethers");
const dotenv = require("dotenv");
dotenv.config();

// Step 1: Set up the Ethereum provider (Base network)
const provider = new ethers.JsonRpcProvider(
  "https://base-mainnet.infura.io/v3/85e931233d114d1e9494915d56ec9d54"
);

// Step 2: Set up the sender's wallet using a private key
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Step 3: Define Uniswap Router Contract Address and ABI for Base network (Uniswap V2)
const UNISWAP_ROUTER_ADDRESS = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24"; // Uniswap V2 Router on Base
const UNISWAP_ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];

// Step 4: Set up the contract instance for Uniswap Router
const router = new ethers.Contract(
  UNISWAP_ROUTER_ADDRESS,
  UNISWAP_ROUTER_ABI,
  wallet
);

// Step 5: Define the token addresses
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // WETH on Base
const DAI_ADDRESS = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"; // DAI on Base

// Step 6: Define the amount of ETH you're swapping
const amountInETH = ethers.parseEther("0.001"); // Swap 0.001 ETH

async function getTokenDecimals(tokenAddress) {
  const tokenContract = new ethers.Contract(tokenAddress, [
    "function decimals() view returns (uint8)"
  ], wallet);
  return await tokenContract.decimals();
}

async function getERC20Balance(tokenAddress) {
  const tokenContract = new ethers.Contract(tokenAddress, [
    "function balanceOf(address owner) view returns (uint256)"
  ], wallet);
  return await tokenContract.balanceOf(wallet.address);
}

async function getEthBalance() {
  return await provider.getBalance(wallet.address);
}

async function swapExactEthForTokens() {
  try {
    // Fetch decimals for WETH and DAI
    const wethDecimals = await getTokenDecimals(WETH_ADDRESS);
    const daiDecimals = await getTokenDecimals(DAI_ADDRESS);

    // Fetch balances before the transaction
    const ethBalanceBefore = await getEthBalance();
    const daiBalanceBefore = await getERC20Balance(DAI_ADDRESS);

    console.log(`ETH Balance Before: ${ethers.formatEther(ethBalanceBefore)}`);
    console.log(`DAI Balance Before: ${ethers.formatUnits(daiBalanceBefore, daiDecimals)}`);

    // Set a reasonable deadline (current time + 20 minutes)
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    // Define the path for the swap
    const path = [WETH_ADDRESS, DAI_ADDRESS];

    // Use getAmountsOut to calculate expected output amount
    const amountsOut = await router.getAmountsOut(amountInETH, path);
    const expectedAmountOut = amountsOut[1]; // The second amount is the expected output (DAI)

    // Set amountOutMin to 95% of expected amount
    const amountOutMin = expectedAmountOut * 95n / 100n; // Adjust this percentage as needed

    // Send the swap transaction
    const tx = await router.swapExactETHForTokens(
      amountOutMin,
      path,
      wallet.address,
      deadline,
      { value: amountInETH, gasLimit: 300000 }
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction mined in block ${receipt.blockNumber}`);

    // Fetch balances after the transaction
    const ethBalanceAfter = await getEthBalance();
    const daiBalanceAfter = await getERC20Balance(DAI_ADDRESS);

    console.log(`ETH Balance After: ${ethers.formatEther(ethBalanceAfter)}`);
    console.log(`DAI Balance After: ${ethers.formatUnits(daiBalanceAfter, daiDecimals)}`);

    const slippage = Number((ethBalanceAfter - ethBalanceBefore) * 100n / expectedAmountOut);

    console.log(`Expected Amount Out: ${ethers.formatUnits(expectedAmountOut, daiDecimals)}`);
    console.log(`Actual Amount Out: ${ethers.formatUnits(amountInETH, daiDecimals)}`);
    console.log(`Slippage: ${slippage.toFixed(2)}%`);

    // Log balance changes
    const ethChange = ethBalanceAfter - ethBalanceBefore;
    const daiChange = daiBalanceAfter - daiBalanceBefore;

    console.log(`Change in ETH Balance: ${ethers.formatEther(ethChange)}`);
    console.log(`Change in DAI Balance: ${ethers.formatUnits(daiChange, daiDecimals)}`);

    // Log all events
    for (const log of receipt.logs) {
      console.log("Event:", log);
    }
  } catch (error) {
    console.error(`Error occurred during swap: ${error.message}`);
  }
}

swapExactEthForTokens();
