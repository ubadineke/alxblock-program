use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Token, TokenAccount, Mint, Transfer},
    associated_token::AssociatedToken,
};
use crate::states::*;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
      init,
      payer = admin,
      associated_token::mint = token_mint,
      associated_token::authority = admin
    )]
    pub admin_token_account: Account<'info, TokenAccount>, // Admin's token account
    
    #[account(
      init_if_needed,
      payer = admin,
      space = 8 + TokenVault::INIT_SPACE,
      seeds = [b"vault-authority"],
      bump
    )]
    pub vault_authority: Account<'info, TokenVault>, // PDA for metadata and authority,
    
    #[account(
        init,
        payer = admin,
        associated_token::mint = token_mint,
        associated_token::authority = vault_authority,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_vault(
    ctx: Context<InitializeVault>,
    total_supply: u64,
) -> Result<()> {
    // Calculate expected token amount (65% of 15% of total supply)
    let expected_amount = (15 * 65 * total_supply) / 10000;
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.admin_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        },
    );
     // Derive the PDA seeds and bump
    //  let seeds = &[b"vault-authority"];
    //  let bump = ctx.bumps.vault_authority;
    //  let signer_seeds: &[&[&[u8]]] = &[&[seeds[0], &[bump]]];
    // let cpi_ctx = CpiContext::new_with_signer(
    //     ctx.accounts.token_program.to_account_info(),
    //     Transfer {
    //         from: ctx.accounts.admin_token_account.to_account_info(),
    //         to: ctx.accounts.vault_token_account.to_account_info(),
    //         authority: ctx.accounts.vault_authority.to_account_info(),
    //     },
    //     signer_seeds,
    // );
    token::transfer(cpi_ctx, expected_amount)?;

    // Initialize vault metadata
    let token_vault = &mut ctx.accounts.vault_authority;
    token_vault.admin = ctx.accounts.admin.key();
    token_vault.token_mint = ctx.accounts.token_mint.key();
    token_vault.vault_token_account = ctx.accounts.vault_token_account.key();
    token_vault.total_tokens = expected_amount;
    token_vault.bump = ctx.bumps.vault_authority;
    token_vault.is_initialized = true;


    Ok(())
}