use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct RegisterContribution<'info>{
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
  pub system_program: Program<'info, System>
}

pub fn register_contribution(
  ctx: Context<RegisterContribution>,
  points: u64
) -> Result<()>{
  let contributor = &mut ctx.accounts.contributor;
  contributor.monthly_points += points;
  contributor.total_points += points;
  Ok(())
}