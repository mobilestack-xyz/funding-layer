# Funding Layer

## Setup

```bash
yarn install
```

## Testing

```bash
yarn test
```

## Scripts

### Fetch Referrals

Fetch referrals for a specific protocol, removes duplicate events across chains, and filters out events where the user was previously exposed to the protocol

```bash
yarn ts-node ./scripts/fetch-referrals.ts --protocol Beefy --output output.csv
```

### Fetch Referrals count per referrer

```bash
# networkIds is optional
yarn ts-node ./scripts/referrer-user-count.ts --protocol Beefy --referrerIds app1,app2,app3 --networkIds celo-mainnet,base-mainnet
```

## Contracts

This repository contains the contract(s) necessary to support the Mobilestack Funding Layer.

Registry contract address: 0x5a1a1027aC1d828E7415AF7d797FBA2B0cDD5575

Owner safe: 0xfC95675a6bB93406C0CbBa9403a084Dd8D566F06

### Deployment Process

We use [OpenZeppelin Defender](https://www.openzeppelin.com/defender) to manage deployments on Mainnet. Before beginning a deployment, make sure that your `.env` file is set up correctly. Namely, make sure to get the `DEFENDER_API_KEY`, `DEFENDER_API_SECRET`, `CELOSCAN_API_KEY` values from GSM and copy them in. (Ideally we could inject these config values into Hardhat automatically, but I haven't found a way to do that.)

To deploy, run:

```bash
yarn hardhat run scripts/deploy.ts --network celo
```

After this is done, you should see output in your terminal with a command to run to verify the contract on the block explorers.
