use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct RegisterContributor<'info>{
  #[account(mut)]
  pub user: Signer<'info>,

  #[account(
    init,
    payer = user,
    space = 8 + Contributor::INIT_SPACE,
    seeds = [
      b"contributor",
      user.key().as_ref()
    ],
    bump
  )]
  pub contributor: Account<'info, Contributor>,
  
  #[account(
    mut,
    seeds = [b"global-state"],
    bump
  )] // Initial small allocation; will grow dynamically
  pub global_state: Account<'info, GlobalState>,
  
  pub system_program: Program<'info, System>
}

pub fn create_contributor(
  ctx: Context<RegisterContributor>,
  name: String,
) -> Result<()>{
  let contributor = &mut ctx.accounts.contributor;
  let global_state = &mut ctx.accounts.global_state;
  contributor.name = name;
  contributor.authority = ctx.accounts.user.key();
  contributor.total_points = 0;
  contributor.bump = ctx.bumps.contributor;

  global_state.contributor_count += 1;
  Ok(())
}