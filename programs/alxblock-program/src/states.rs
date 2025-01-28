use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TokenVault{
  pub admin: Pubkey,
  pub token_mint: Pubkey,
  pub vault_token_account: Pubkey,
  pub total_tokens: u64,
  pub is_initialized: bool,
  pub bump: u8,
}