use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct RegisterContribution<'info>{
  #[account(mut)]
  pub admin: Signer<'info>,
  
  #[account(
    mut,
    seeds = [
      b"contributor",
      user.key().as_ref()
    ],
    bump
  )]
  pub contributor: Account<'info, Contributor>,

  ///CHECK: Readonly account used to derive the contributor PDA
  pub user: UncheckedAccount<'info>,

  #[account(
    mut,
    seeds = [b"global-state"],
    bump
  )] // Initial small allocation; will grow dynamically
  pub global_state: Account<'info, GlobalState>,
  
  pub system_program: Program<'info, System>
}

pub fn register_contribution(
  ctx: Context<RegisterContribution>,
  points: u64
) -> Result<()>{
  let contributor = &mut ctx.accounts.contributor;
  let global_state = &mut ctx.accounts.global_state;
  contributor.monthly_points += points;
  contributor.total_points += points;

  global_state.monthly_contributor_points += points;
  global_state.total_points += points;
  Ok(())
}