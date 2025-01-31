use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod errors;
pub mod instructions;
pub mod states;


declare_id!("AANa17EN5vqdUPwtc9hqZ7FZLqPNRZMbbc5cydDGRMCi");

#[program]
pub mod alxblock_program {
    use super::*;

    pub fn init_vault(ctx: Context<InitializeVault>) -> Result<()> {
        initialize_vault(ctx)
    }

    pub fn fund_vault(ctx: Context<FundVault>, total_supply: u64) -> Result<()>{
        fund_token_vault(ctx, total_supply)
    } 

    pub fn create_contributor(ctx: Context<RegisterContributor>, name: String) -> Result<()>{
        create_contributor::create_contributor(ctx, name)
    }

    pub fn record_contribution(ctx: Context<RegisterContribution>, points:u64) -> Result<()>{
        register_contribution(ctx, points)
    }
}
