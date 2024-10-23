import { Side, OrderType } from "@polymarket/clob-client";
import { ClobClient } from "polymarket/clob-client";
import { SignatureType } from "@polymarket/order-utils";

// Initialization of a client that trades directly from an EOA


async function main() {
    const order = await clobClient.createOrder({
        tokenID:
          "71321045679252212594626385532706912750332728571942532289631379312455583992563",
        price: 0.5,
        side: Side.BUY,
        size: 100,
        feeRateBps: 100,
        nonce: 1,
      });
      
  console.log("Order placed");

  const resp = await clobClient.postOrder(order, OrderType.GTC);
  console.log(resp);

function main() {
  placeOrder();
}
}
main();
