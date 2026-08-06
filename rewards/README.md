# Participation reward

How the XIP 25 participation reward was calculated, and what you can check yourself.

## What is here now, and what is not

This directory currently holds the **methodology**: the scoring rubric and the exclusion list.

It does **not** yet hold `merkle.json`, the file with each recipient's amount and proof. That file
is published once the treasury is settled and the final pool is fixed. Until then any tree is a
modelling artifact, because the participation pool is 30% of a number that is not final.

That is not a formality. Changing the pool changes every recipient's amount, which changes every
leaf, which changes the Merkle root. The tree cannot be computed early and adjusted later.

## The rubric

XIP 25 allocated 30% of the distributable treasury to participation, as a reward for holding and
voting rather than a flat split across wallets.

`participation-rubric-v1.json` is the machine-readable policy. In plain terms:

- **75% loyalty** — how long you held, measured across the full ownership history of the collection.
- **20% governance** — Snapshot voting.
- **5% overlap** — a bonus for wallets that did both, sustained over time.

Scores are square-root shaped within each component, which compresses the top end so a few very
large holders do not absorb most of the pool. There is a 30-day history floor and a **0.002 ETH
minimum final payout**, so allocations too small to be worth the gas are not created.

The cutoff is **block 25,529,960**, 14 July 2026. Nothing after that block counts.

## Exclusions

`exclusions-v1.json` records five excluded recipients: the DAO treasury Safe, the wallet of the
person who wrote the formula, the Expansion Punks deployer, the legacy `fu()` project wallet, and
the NFTX xPUNK vault. The project wallets are excluded by treasury decision; NFTX is protocol
custody rather than a beneficial community participant. XIP 25 itself is excluded from governance
scoring, since voting on the proposal that creates the reward should not earn the reward.

Discord activity is not scored at all. It could not be measured fairly across the collection's
history, so it was left out rather than approximated.

## Checking your own allocation

Once `merkle.json` is published you will be able to recompute your own number from the raw
ownership and voting history using the rubric here, and verify your proof against the root stored
in the deployed `RewardsDistributor`.

Two things worth understanding about the proof format.

Each leaf is `keccak256(abi.encodePacked(chainId, wallet, amountWei))`, and the chain ID is bound
into the leaf itself. A proof generated for one chain will not verify on another. The published
`merkle.json` carries a numeric `chainId` field so you can confirm which chain it was built for;
for the production tree that value is `1`.

Eligibility is bound to the claiming wallet, but the payout destination is a separate argument.
If your wallet cannot receive ETH — some contract wallets cannot — you can direct the payment
elsewhere without losing the claim.

## Claiming

You must have migrated at least one punk before you can claim. This applies even if you sold
everything after the cutoff: the allocation is yours, but the contract requires a migration first.
A punk bought on the open market and migrated satisfies it.

Claims are open for 12 months from contract initialization. After that the unclaimed remainder
moves into the second reward window rather than staying claimable.

## What this does not tell you

The relative weights here are the reusable part. The absolute amounts are not final until the
treasury snapshot is taken and signed off, and the tree is regenerated for that exact figure.

If you are reading this and `merkle.json` is still absent, that step has not happened yet.
