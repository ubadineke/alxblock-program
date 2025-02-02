use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError{
  #[msg("Token amount must be exactly (15 * 65 * total_supply) / 10000")]
    NotExactTokenAmount,
    #[msg("Zero points, no token for you")]
    ZeroContributionPoints,
    #[msg("Division by zero")]
    DivisionByZero,
    #[msg("Overflow error")]
    Overflow,
    #[msg("No reward for you")]
    NoRewardToClaim
}