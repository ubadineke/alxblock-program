import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { AlxblockProgram } from "../target/types/alxblock_program";
import {
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createMint,
  mintTo,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("alxblock-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AlxblockProgram as Program<AlxblockProgram>;
  let admin = anchor.web3.Keypair.generate();
  let tokenMint;
  let adminTokenAccount;
  let vaultAuthority;
  let vaultTokenAccount;
  let globalStatePDA;
  let contributorPDA;
  let user = anchor.web3.Keypair.generate();
  let rewardPoolPDA;
  let rewardsTokenAccount;

  const totalSupply = 1000000;
  const expectedTokenAmount = (15 * 65 * totalSupply) / 10000;

  before(async () => {
    // Airdrop SOL to the admin wallet
    const signature = await provider.connection.requestAirdrop(
      admin.publicKey,
      1000000000 // 1 SOL
    );
    await provider.connection.confirmTransaction(signature, "confirmed");

    // Create a token mint
    tokenMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      9 // Decimals
    );

    // Derive the vault authority PDA
    [vaultAuthority] = await PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority")],
      program.programId
    );

    [rewardPoolPDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("reward-pool")],
      program.programId
    );

    vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      vaultAuthority,
      true
    );

    adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      admin.publicKey,
      true
    );

    rewardsTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      tokenMint,
      rewardPoolPDA,
      true
    );

    [globalStatePDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("global-state")],
      program.programId
    );

    [contributorPDA] = await PublicKey.findProgramAddressSync(
      [Buffer.from("contributor"), user.publicKey.toBuffer()],
      program.programId
    );

    const signature2 = await provider.connection.requestAirdrop(
      user.publicKey,
      1000000000 // 1 SOL
    );

    await provider.connection.confirmTransaction(signature2, "confirmed");

    const signature3 = await provider.connection.requestAirdrop(
      rewardsTokenAccount.address,
      1000000000 // 1 SOL
    );

    await provider.connection.confirmTransaction(signature3, "confirmed");
  });

  it("Should initialize global state with correct values", async () => {
    const monthlyTokenPool = new anchor.BN(10000);

    await program.methods
      .initGlobalState(monthlyTokenPool)
      .accounts({
        admin: admin.publicKey,
        globalState: globalStatePDA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    const state = await program.account.globalState.fetch(globalStatePDA);

    assert.strictEqual(state.contributorCount.toNumber(), 0, "Initial contribution count mismatch");
    assert.strictEqual(
      state.monthlyContributorPoints.toNumber(),
      0,
      "Initial contribution point mismatch"
    );
    assert.strictEqual(
      state.monthlyTokenPool.toString(),
      monthlyTokenPool.toString(),
      "Monthly token mismatch"
    );
  });

  it("should initialize the vault", async () => {
    // Call the initialize_vault instruction
    await program.methods
      .initVault()
      .accounts({
        admin: admin.publicKey,
        vaultAuthority: vaultAuthority,
        vaultTokenAccount: vaultTokenAccount.address,
        tokenMint: tokenMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();

    // Fetch the vault authority account
    const vaultAccount = await program.account.tokenVault.fetch(vaultAuthority);

    // Verify the vault authority account
    assert.isTrue(vaultAccount.isInitialized, "Vault not initialized");
    assert.strictEqual(
      vaultAccount.admin.toBase58(),
      admin.publicKey.toBase58(),
      "Admin pubkey mismatch"
    );
    assert.strictEqual(
      vaultAccount.tokenMint.toBase58(),
      tokenMint.toBase58(),
      "Token mint mismatch"
    );
    assert.strictEqual(
      vaultAccount.vaultTokenAccount.toBase58(),
      vaultTokenAccount.address.toBase58(),
      "Vault token account mismatch"
    );
    assert.strictEqual(vaultAccount.totalTokens.toNumber(), 0, "Total tokens should be 0");

    const tokenAccountInfo = await getAccount(provider.connection, vaultTokenAccount.address);

    assert.strictEqual(
      tokenAccountInfo.owner.toBase58(),
      vaultAuthority.toBase58(),
      "Token account authority mismatch"
    );
  });
  fetch;
  it("should fund the vault", async () => {
    const vaultAccountInfo = await getAccount(provider.connection, vaultTokenAccount.address);

    const adminAccountInfo = await getAccount(provider.connection, adminTokenAccount.address);

    console.log("Initial Admin Token Account Balance:", adminAccountInfo.amount.toString());
    console.log("Initial Vault Token Account Balance:", vaultAccountInfo.amount.toString());

    await mintTo(
      provider.connection,
      admin,
      tokenMint,
      adminTokenAccount.address,
      admin.publicKey,
      totalSupply,
      [],
      { commitment: "confirmed" }
    );

    const adminAccountInfo2 = await getAccount(provider.connection, adminTokenAccount.address);
    console.log("Post Mint Admin Token Account Balance:", adminAccountInfo2.amount.toString());
    console.log("Post Mint Vault Token Account Balance:", vaultAccountInfo.amount.toString());

    await program.methods
      .fundVault(new anchor.BN(totalSupply))
      .accounts({
        admin: admin.publicKey,
        adminTokenAccount: adminTokenAccount.address,
        vaultAuthority: vaultAuthority,
        vaultTokenAccount: vaultTokenAccount.address,
        tokenMint: tokenMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();

    const vaultAccountInfo3 = await getAccount(provider.connection, vaultTokenAccount.address);
    const adminAccountInfo3 = await getAccount(provider.connection, adminTokenAccount.address);
    console.log("Post Fund Admin Token Account Balance:", adminAccountInfo3.amount.toString());
    console.log("Post Fund Vault Token Account Balance:", vaultAccountInfo3.amount.toString());
    // Fetch the vault authority account
    const vaultAccount = await program.account.tokenVault.fetch(vaultAuthority);

    // Fetch the admin's token account balance
    const adminTokenAccountInfo = await provider.connection.getTokenAccountBalance(
      adminTokenAccount.address
    );
    assert.strictEqual(
      adminTokenAccountInfo.value.amount,
      (totalSupply - 0.15 * 0.65 * totalSupply).toString(), // Remaining tokens after transfer
      "Admin token account balance mismatch"
    );
    // Fetch the vault token account balance
    const vaultTokenAccountInfo = await provider.connection.getTokenAccountBalance(
      vaultTokenAccount.address
    );
    assert.strictEqual(
      vaultTokenAccountInfo.value.amount,
      (0.15 * 0.65 * totalSupply).toString(), // Transferred tokens
      "Vault token account balance mismatch"
    );
  });

  it("create contributor", async () => {
    const contributorName = "Test Contributor-David";

    // Execute the transaction
    await program.methods
      .createContributor(contributorName)
      .accounts({
        user: user.publicKey,
        contributor: contributorPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    // Fetch the created account
    const contributorAccount = await program.account.contributor.fetch(contributorPDA);

    // Verify the account data
    assert.strictEqual(contributorAccount.name, contributorName, "Contributor name mismatch");
    assert.strictEqual(
      contributorAccount.authority.toString(),
      user.publicKey.toString(),
      "Authority mismatch"
    );

    assert.strictEqual(contributorAccount.totalPoints.toNumber(), 0, "Points mismatch");
  });

  it("Should register contribution and update points", async () => {
    const pointsToAdd = new anchor.BN(50);

    await program.methods
      .recordContribution(pointsToAdd)
      .accounts({
        admin: admin.publicKey,
        contributor: contributorPDA,
        user: user.publicKey,
        globalState: globalStatePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    // Fetch updated contributor account
    const contributorAccount = await program.account.contributor.fetch(contributorPDA);

    assert.strictEqual(
      contributorAccount.monthlyPoints.toNumber(),
      pointsToAdd.toNumber(),
      "Monthly Points not equal/mismatch"
    );

    assert.strictEqual(
      contributorAccount.totalPoints.toNumber(),
      pointsToAdd.toNumber(),
      "Total points mismatch"
    );
  });

  it("Should calculate reward when monthly_contributor_points > 500", async () => {
    // Setup: Ensure contributor has points and global state is initialized
    await program.methods
      .checkMonthlyReward()
      .accounts({
        user: user.publicKey,
        contributor: contributorPDA,
        globalState: globalStatePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const contributorAccount = await program.account.contributor.fetch(contributorPDA);
    const reward = contributorAccount.reward;

    const globalState = await program.account.globalState.fetch(globalStatePDA);
    // console.log("Contributor's monthly points", contributorAccount.monthlyPoints.toNumber());
    // console.log("programs Token Pool", globalState.monthlyTokenPool.toNumber());
    // console.log(
    //   "Total Accrued COntributor points that month",
    //   globalState.monthlyContributorPoints.toNumber()
    // );

    // Calculate expected reward
    const expectedReward = Math.floor(
      (contributorAccount.monthlyPoints.toNumber() /
        globalState.monthlyContributorPoints.toNumber()) *
        globalState.monthlyContributorPoints.toNumber()
    );
    // console.log("Calculated Expected Reward", expectedReward);
    // console.log("Reward from program", reward);

    assert.strictEqual(reward.toNumber(), expectedReward, "Reward not expected");
  });

  it("Should fund reward pool", async () => {
    await program.methods
      .fundRewardPool()
      .accounts({
        admin: admin.publicKey,
        vaultAuthority: vaultAuthority,
        vaultTokenAccount: vaultTokenAccount.address,
        rewardPool: rewardPoolPDA,
        rewardsTokenAccount: rewardsTokenAccount.address,
        globalState: globalStatePDA,
        tokenMint: tokenMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    const rewardAccount = await program.account.rewardPool.fetch(rewardPoolPDA);
    console.log(rewardAccount);
  });
});

//admin calculates reward and send to a reward pool
//contributors can claim reward from the reward pool
