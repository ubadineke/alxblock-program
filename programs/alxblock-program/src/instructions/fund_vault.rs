use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Token, TokenAccount, Mint, Transfer},
    associated_token::AssociatedToken,
};
use crate::states::*;


#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = admin,
    )]
    pub admin_token_account: Box<Account<'info, TokenAccount>>, // Admin's token account
    
    #[account(
        mut,
        seeds = [b"vault-authority"],
        bump = vault_authority.bump,
    )]
    pub vault_authority: Account<'info, TokenVault>, // PDA for metadata and authority,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = vault_authority,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn fund_token_vault(
    ctx: Context<FundVault>,
    total_supply: u64
) -> Result<()> {

      // Calculate expected token amount (65% of 15% of total supply)
    let expected_amount = (15 * 65 * total_supply) / 10000;

  let cpi_ctx =  CpiContext::new(
    ctx.accounts.token_program.to_account_info(),
    Transfer {
        from: ctx.accounts.admin_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    },
  );

    token::transfer(cpi_ctx, expected_amount)?;

    // Update vault metadata
    let token_vault = &mut ctx.accounts.vault_authority;
    token_vault.total_tokens = token_vault.total_tokens.checked_add(expected_amount).unwrap();

    Ok(())
}