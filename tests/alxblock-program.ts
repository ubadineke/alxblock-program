import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AlxblockProgram } from "../target/types/alxblock_program";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("alxblock-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AlxblockProgram as Program<AlxblockProgram>;

  let admin: anchor.web3.Keypair;
  let adminTokenAccount: anchor.web3.PublicKey;
  let vaultAuthority: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let tokenVaultMetadata: anchor.web3.PublicKey;
  let tokenMint: anchor.web3.Keypair;
  let vaultAuthorityBump: number;

  const totalSupply = 10000;
  const expectedTokenAmount = (15 * 65 * totalSupply) / 10000;

  before(async () => {
    try {
      admin = Keypair.generate();
      tokenMint = Keypair.generate();

      // Airdrop SOL to the admin
      const signature = await provider.connection.requestAirdrop(admin.publicKey, 1000000000);
      await provider.connection.confirmTransaction(signature, "confirmed");
      console.log("1. Airdrop completed");

      // Create the token mint
      await createMint(provider.connection, admin, admin.publicKey, null, 9, tokenMint);
      console.log("2. Token mint created:", tokenMint.publicKey.toString());

      // Get admin token account address
      // adminTokenAccount = await getAssociatedTokenAddress(tokenMint.publicKey, admin.publicKey);

      // Create the admin's token account and wait for confirmation
      adminTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin, // Admin's wallet
        tokenMint.publicKey, // Token mint
        admin.publicKey // Admin should own this token account
      );
      console.log("3. Admin token account created:", adminTokenAccount.toBase58());

      // Add a small delay to ensure account creation is propagated
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify token account with retries
      let tokenAccount = null;
      let retries = 5;
      while (retries > 0) {
        try {
          tokenAccount = await getAccount(provider.connection, adminTokenAccount, "confirmed");
          console.log("4. Token account verified");
          break;
        } catch (e) {
          console.log(`Retry ${6 - retries}: Waiting for token account to be confirmed...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          retries--;
          if (retries === 0) throw e;
        }
      }

      // Derive vault authority
      [vaultAuthority, vaultAuthorityBump] = await PublicKey.findProgramAddressSync(
        [Buffer.from("vault-authority")],
        program.programId
      );
      console.log("5. PDA derived:", vaultAuthority.toBase58());

      // Only proceed with minting if we successfully verified the token account
      if (tokenAccount) {
        await mintTo(
          provider.connection,
          admin,
          tokenMint.publicKey,
          adminTokenAccount,
          admin,
          totalSupply,
          [],
          { commitment: "confirmed" }
        );
        console.log(`6. Minted ${totalSupply} tokens to admin`);

        vaultTokenAccount = await getAssociatedTokenAddress(
          tokenMint.publicKey,
          vaultAuthority,
          true
        );
        console.log("7. Vault token account derived:", vaultTokenAccount.toBase58());
      }
    } catch (error) {
      console.error("Setup error:", error);
      throw error;
    }
  });

  it("should initialize the vault", async () => {
    try {
      console.log("Starting vault initialization test");
      console.log("Admin pubkey:", admin.publicKey.toBase58());
      console.log("Token mint:", tokenMint.publicKey.toBase58());

      await program.methods
        .initVault(new anchor.BN(totalSupply)) // Match the exact function name from your program
        .accounts({
          admin: admin.publicKey,
          adminTokenAccount: adminTokenAccount,
          vaultAuthority: vaultAuthority,
          vaultTokenAccount: vaultTokenAccount,
          tokenMint: tokenMint.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();

      const vaultAccount = await program.account.tokenVault.fetch(vaultAuthority);

      assert.isTrue(vaultAccount.isInitialized, "Vault not initialized");
      assert.strictEqual(
        vaultAccount.totalTokens.toNumber(),
        expectedTokenAmount,
        "Vault total tokens mismatch"
      );
      assert.strictEqual(
        vaultAccount.admin.toBase58(),
        admin.publicKey.toBase58(),
        "Admin pubkey mismatch"
      );
      assert.strictEqual(
        vaultAccount.tokenMint.toBase58(),
        tokenMint.publicKey.toBase58(),
        "Token mint mismatch"
      );
      assert.strictEqual(
        vaultAccount.vaultTokenAccount.toBase58(),
        vaultTokenAccount.toBase58(),
        "Vault token account mismatch"
      );
      assert.strictEqual(vaultAccount.bump, vaultAuthorityBump, "Bump seed mismatch");
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });
});
