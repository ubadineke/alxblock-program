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

  const totalSupply = 10000;
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

  it("should fund the vault", async () => {
    console.log("start");

    // Print out
    console.log(34235232, admin.publicKey.toString());
    console.log(34443433, adminTokenAccount.owner.toString());
    // to confirm they match

    const vaultAccountInfo = await getAccount(provider.connection, vaultTokenAccount.address);
    // console.log("TOKENN", vaultAccountInfo);

    const adminAccountInfo = await getAccount(provider.connection, adminTokenAccount.address);
    // console.log("ADMIN TOKEENNNN", adminAccountInfo);

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
    console.log(1, 2, 3);

    const adminAccountInfo2 = await getAccount(provider.connection, adminTokenAccount.address);
    console.log("Post Mint Admin Token Account Balance:", adminAccountInfo2.amount.toString());
    console.log("Post Mint Vault Token Account Balance:", vaultAccountInfo.amount.toString());

    console.log(1, 2, 3, 4);
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
    console.log("Post Mint Admin Token Account Balance:", adminAccountInfo3.amount.toString());
    console.log("Post Mint Vault Token Account Balance:", vaultAccountInfo3.amount.toString());

    console.log("after the brink");
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
    console.log(3);

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
    let user = anchor.web3.Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      1000000000 // 1 SOL
    );

    await provider.connection.confirmTransaction(signature, "confirmed");
    const [contributorPDA, bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("contributor"), user.publicKey.toBuffer()],
      program.programId
    );

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
});
