use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct InitializeGlobalState<'info> {
  #[account(mut)]
  pub admin: Signer<'info>,

  #[account(
    init_if_needed, 
    payer = admin, 
    space = 8 + GlobalState::INIT_SPACE,
    seeds = [b"global-state"],
    bump
  )] // Initial small allocation; will grow dynamically
  pub global_state: Account<'info, GlobalState>,

  pub system_program: Program<'info, System>,
}

pub fn initialize_global_state(ctx: Context<InitializeGlobalState>, monthly_token_pool: u64) -> Result<()> {
  let global_state = &mut ctx.accounts.global_state;
  global_state.admin = ctx.accounts.admin.key();
  global_state.contributor_count = 0;
  global_state.monthly_contributor_points = 0;
  global_state.monthly_token_pool = monthly_token_pool;
  Ok(())

}