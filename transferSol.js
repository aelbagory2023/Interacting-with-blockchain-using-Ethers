//transfer sol from one wallet to another
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from 'dotenv';
dotenv.config();

const connection = new web3.Connection("https://api.mainnet-beta.solana.com");

async function transferSol(senderKeypair, recipientPublicKey, amount) {
    const recipient = new web3.PublicKey(recipientPublicKey);

    const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: recipient,
            lamports: web3.LAMPORTS_PER_SOL * amount, // Convert SOL to lamports
        })
    );

    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
    console.log("Transfer successful with signature:", signature);
}

// Example usage
const senderPrivateKey = process.env.SOLANA_PRIVATE_KEY;
if (!senderPrivateKey) {
    throw new Error("SOLANA_PRIVATE_KEY is not set in the environment variables");
}

const senderKeypair = web3.Keypair.fromSecretKey(bs58.decode(senderPrivateKey));
const recipientPublicKey = "EihXY3TqqL4e2L74zpjtDUjusUxmgF9bFXngYjhATsSa"; // Recipient's public key
const amount = 0.001; // Amount in SOL

transferSol(senderKeypair, recipientPublicKey, amount).catch(console.error);
