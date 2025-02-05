use anchor_lang::prelude::*;
use crate::{errors::CustomError, states::*};

#[derive(Accounts)]
pub struct UpdateMerkleRoot<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
      mut,
      seeds = [b"global-state"],
      bump
    )] // Initial small allocation; will grow dynamically
    pub global_state: Account<'info, GlobalState>,
}

pub fn update_merkle_root(
  ctx: Context<UpdateMerkleRoot>,
  new_root:[u8; 32],
  period: String,
) -> Result<()>{
  let global_state = &mut ctx.accounts.global_state;
        require!(ctx.accounts.authority.key() == global_state.admin, CustomError::Unauthorized);
        
        global_state.merkle_root = new_root;
        global_state.current_period = period;
        Ok(())

}