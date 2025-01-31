use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct InitializeGlobalState<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(init, payer = payer, space = 8 + GlobalState::INIT_SPACE)] // Initial small allocation; will grow dynamically
  pub global_state: Account<'info, GlobalState>,

  pub system_program: Program<'info, System>,
}

pub fn initialize_global_state(ctx: Context<InitializeGlobalState>) -> Result<()> {
  let global_state = &mut ctx.accounts.global_state;
  global_state.contributor_count = 0;
  global_state.monthly_total_points = 0;
  Ok(())
}