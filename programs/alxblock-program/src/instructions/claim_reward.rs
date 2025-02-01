use anchor_lang::prelude::*;
use anchor_spl::{
  token::{ self, Transfer, Token, TokenAccount, Mint},
  associated_token::AssociatedToken,
};
use crate::{errors::CustomError, states::*};

#[derive(Accounts)]
pub struct ClaimReward<'info>{

}