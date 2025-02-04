use anchor_lang::prelude::*;
use anchor_spl::{
  token::{ self, Transfer, Token, TokenAccount, Mint},
  associated_token::AssociatedToken,
};
use crate::{errors::CustomError, states::*};

#[derive(Accounts)]
pub struct FundRewardPool<'info>{
  #[account(mut)]
  pub admin: Signer<'info>,

  #[account(
    mut,
    seeds = [b"vault-authority"],
    bump,
  )]
  pub vault_authority: Account<'info, TokenVault>, // PDA for metadata and authority,

  #[account(
    mut,
    associated_token::mint = token_mint,
    associated_token::authority = vault_authority,
  )]
  pub vault_token_account: Account<'info, TokenAccount>,

  #[account(
    init_if_needed,
    payer = admin,
      space = 8 + RewardPool::INIT_SPACE,
      seeds = [b"reward-pool"],
      bump
  )]
  pub reward_pool: Account<'info, RewardPool>, //authority and metadata

  #[account(
    init_if_needed,
    payer = admin,
    associated_token::mint = token_mint,
    associated_token::authority = reward_pool,
  )]
  pub rewards_token_account: Account<'info, TokenAccount>,

  #[account(
    init_if_needed,
    payer = admin,
      space = 8 + CommunityReserveFund::INIT_SPACE,
      seeds = [b"community-reserve-fund"],
      bump
  )]
  pub community_reserve_fund: Account<'info, CommunityReserveFund>, //authority and metadata

  #[account(
    init_if_needed,
    payer = admin,
    associated_token::mint = token_mint,
    associated_token::authority = community_reserve_fund,
  )]
  pub community_reserve_fund_account: Account<'info, TokenAccount>,

  #[account(
    mut,
    seeds = [b"global-state"],
    bump
  )] // Initial small allocation; will grow dynamically
  pub global_state: Account<'info, GlobalState>,
  
  #[account(mut)]
  pub token_mint: Account<'info, Mint>,

  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn fund_reward_pool(
  ctx: Context<FundRewardPool>,
) -> Result<()>{

    let reward_pool = &mut ctx.accounts.reward_pool;
    let global_state = &mut ctx.accounts.global_state;

    let monthly_tokens = if global_state.monthly_contributor_points > 500 {
      global_state.monthly_token_pool

  } else {
    //Slash monthly token pool by 50%
    global_state.monthly_token_pool.checked_div(2)
    .ok_or(CustomError::Overflow)?;
  
    //Transfer the rest of the tokens to the community reserve fund
    ...
  };
  
  //Fund reward pool
  ...
  token::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.rewards_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        },
        &[&[
            b"vault-authority",
            &[ctx.bumps.vault_authority]
        ]]
    ),
    monthly_tokens
)?;

    reward_pool.is_initialized  = true;
    reward_pool.total_tokens = monthly_tokens;
    reward_pool.rewards_token_account = ctx.accounts.rewards_token_account.key();
    global_state.rewards_token_account = ctx.accounts.rewards_token_account.key();

  Ok(())
}
