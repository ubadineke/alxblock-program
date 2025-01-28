use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod errors;
pub mod instructions;
pub mod states;


declare_id!("AANa17EN5vqdUPwtc9hqZ7FZLqPNRZMbbc5cydDGRMCi");

#[program]
pub mod alxblock_program {
    use super::*;

    pub fn init_vault(ctx: Context<InitializeVault>, total_supply: u64) -> Result<()> {
        initialize_vault(ctx, total_supply)
    }
}
