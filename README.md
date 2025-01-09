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

### Filter Referrals

Filter out referalls where the user had already interacted with the protocol in question.

```bash
npx ts-node ./scripts/filter-referrals.ts --protocol beefy --input input.csv --output output.csv
```

## Contracts

This repository contains the contract(s) necessary to support the Mobilestack Funding Layer.

### Deployment Process

We use [OpenZeppelin Defender](https://www.openzeppelin.com/defender) to manage deployments on Mainnet. Before beginning a deployment, make sure that your `.env` file is set up correctly. Namely, make sure to get the `DEFENDER_API_KEY`, `DEFENDER_API_SECRET`, `CELOSCAN_API_KEY` values from GSM and copy them in. (Ideally we could inject these config values into Hardhat automatically, but I haven't found a way to do that.)

To deploy, run:

```bash
yarn hardhat run scripts/deploy.ts --network celo
```

After this is done, you should see output in your terminal with a command to run to verify the contract on the block explorers.
