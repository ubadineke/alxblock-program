use anchor_lang::prelude::*;
use crate::{errors::CustomError, states::*};

#[derive(Accounts)]
pub struct CheckReward<'info>{
  #[account(mut)]
  pub user: Signer<'info>,

  #[account(
    mut,
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

pub fn check_reward(
  ctx: Context<CheckReward>,
) -> Result<()>{
  let global_state = &ctx.accounts.global_state;
  let contributor = &mut ctx.accounts.contributor;

  require!(
    contributor.monthly_points > 0,
    CustomError::ZeroContributionPoints
  );
  
  // WHEN TOTAL MONTHLY POINTS LESS THAN 500, SLASH THE REWARD
  let slash= if global_state.monthly_contributor_points > 500 {1} else {2};
  
  let reward = contributor.monthly_points
  .checked_div(global_state.monthly_contributor_points)
  .ok_or(CustomError::DivisionByZero)?
  .checked_mul(100)
  .ok_or(CustomError::Overflow)?
  .checked_div(slash)
  .ok_or(CustomError::DivisionByZero)?;

  contributor.reward = reward;

  Ok(())
}
