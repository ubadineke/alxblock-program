use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TokenVault{
  pub admin: Pubkey,
  pub token_mint: Pubkey,
  pub vault_token_account: Pubkey,
  pub total_tokens: u64,
  pub remaining_tokens: u64,
  pub is_initialized: bool,
  pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Contributor{
  #[max_len(32)]
  pub name: String, 
  pub authority: Pubkey,
  pub monthly_points: u64,
  pub total_points : u64,
  pub bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub contributor_count: u64,
    pub monthly_total_points: u64,
    pub bump: u8
}
