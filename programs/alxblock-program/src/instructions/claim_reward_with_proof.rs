use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::{hash, Hash};
use anchor_spl::{
  token::{self, Transfer, Token, TokenAccount, Mint},
  associated_token::AssociatedToken,
};
use crate::errors::CustomError;

use super::ClaimReward;



pub fn claim_rewards(
  ctx: Context<ClaimReward>,
  timestamp: i64,
  description: String,
  contribution_type: ContributionType,
  points: u64,
  proof: Vec<[u8; 32]>,
) -> Result<()> {
  let global_state = &ctx.accounts.global_state;
  let contributor = &mut ctx.accounts.contributor;

  // Compute reward amount based on points
  let reward_amount = contributor.current_reward;
  require!(
      reward_amount > 0,
      CustomError::NoRewardToClaim
  );


  // Verify merkle proof
  let leaf = hash_contribution(
      &contributor.authority,
      timestamp,
      &description,
      contribution_type,
      points,
  );

  require!(
      verify_proof(&proof, &global_state.merkle_root, &leaf),
      CustomError::InvalidProof
  );

  // Transfer rewards
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


  contributor.current_reward = 0;
  contributor.total_rewards += reward_amount;
  contributor.last_claimed_period = global_state.current_period;

  Ok(())
}

pub fn hash_contribution(
  contributor: &Pubkey,
  timestamp: i64,
  description: &str,
  contribution_type: ContributionType,
  points: u64,
) -> [u8; 32] {
  let mut hasher = sha2::Sha256::new();
  hasher.update(contributor.to_bytes());
  hasher.update(&timestamp.to_le_bytes());
  hasher.update(description.as_bytes());
  hasher.update(&(contribution_type as u8).to_le_bytes());
  hasher.update(&points.to_le_bytes());
  hasher.finalize().into()
}

fn verify_proof(proof: &[[u8; 32]], root: &[u8; 32], leaf: &[u8; 32]) -> bool {
  let mut current = *leaf;
  for p in proof {
      current = if current <= *p {
          hash(&[&current, p]).to_bytes()
      } else {
          hash(&[p, &current]).to_bytes()
      };
  }
  current == *root
}