# EIP 3074 end to end demo

This is a simple end to end demo of EIP 3074. It demonstrates how EIP 3074 can be used for sponsoring gas fees for users and executing transactions on behalf of them. In this demo we show how Authority can authorise invoker wallet to transfer ERC20 tokens on behalf of themselves.

In the context of this demo, we have 3 types of users:
1. Sponsor: The user who is sponsoring the gas fees for another user
2. Authority: The user who is authorising the token transfer on their behalf
3. Receiver: The user who will receive the tokens

## Prerequisites
1. Add Kakarot Sepolia to MetaMask
2. Get test ETH from the Kakarot Faucet to Sponsor's account

## Setup

1. Clone the repository
2. Install dependencies
```bash
npm install
```
3. Run the project
```bash
npm run start
```
4. Open the browser and navigate to `http://localhost:3000`

## Steps
1. Connect the Authority Wallet to sign the authorisation
2. Connect the Sponsor Wallet to invoke the transfer transaction on behalf of the Authority and pay the gas fees

## Disclaimer
This is a simple demo to showcase the capabilities of EIP 3074. It is not production ready and should not be used as is in a production environment.

Also, it uses `eth_sign` to sign the authorisation message. This is not a secure way to sign messages and should not be used in production. Use a secure way to sign messages in production.
