use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Transfer, Token, TokenAccount, Mint},
    associated_token::AssociatedToken,
};
use crate::{errors::CustomError, states::*};

#[derive(Accounts)]
pub struct ClaimReward<'info> {
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
        seeds = [b"reward-pool"],
        bump
    )]
    pub reward_pool: Account<'info, RewardPool>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = reward_pool,
    )]
    pub rewards_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    /// CHECK: Used for seeds only
    #[account(seeds = [b"reward-pool"], bump)]
    pub reward_pool_authority: UncheckedAccount<'info>,
}

pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
    let contributor = &mut ctx.accounts.contributor;

    let reward_amount = contributor.reward;

    require!(
        reward_amount > 0,
        CustomError::NoRewardToClaim
    );

    token::transfer(
      CpiContext::new_with_signer(
          ctx.accounts.token_program.to_account_info(),
          Transfer {
              from: ctx.accounts.rewards_token_account.to_account_info(),
              to: ctx.accounts.user_token_account.to_account_info(),
              authority: ctx.accounts.reward_pool.to_account_info(),
          },
          &[&[
              b"reward-pool",
              &[ctx.bumps.reward_pool]
          ]]
      ),
      reward_amount
    )?;

    // Reset the reward amount after successful transfer
    contributor.reward = 0;

    Ok(())
}