import { Tool } from "langchain/tools";
import { AgentRuntime, parseJson } from "../..";
import { convertAmountFromHumanReadableToOnChain } from "@aptos-labs/ts-sdk";

export class EchelonWithdrawTokenTool extends Tool {
	name = "echelon_withdraw_token";
	description = `this tool can be used to withdraw APT, tokens or fungible asset from a position

  if you want to withdraw APT, add "0x1::aptos_coin::AptosCoin" as mint
  if no mint is provided, send the mint blank. mint is optional in this case

  Inputs ( input is a JSON string ):
  name: string, eg "USDT" (required)
  amount: number, eg 1 or 0.01 (required)
  mint: string, eg "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT" (optional)
  `;

	constructor(private agent: AgentRuntime) {
		super();
	}

	protected async _call(input: string): Promise<string> {
		try {
			const parsedInput = parseJson(input);

			const token = this.agent.getTokenByTokenName(parsedInput.name);

			if (!token) throw new Error("Token not found");
			
			const mint =
				parsedInput.mint ||
				token.tokenAddress ||
				"0x1::aptos_coin::AptosCoin";

			const mintDetail = await this.agent.getTokenDetails(mint);

			const withdrawTokenTransactionHash =
				await this.agent.withdrawTokenWithEchelon(
					mint,
					convertAmountFromHumanReadableToOnChain(
						parsedInput.amount,
						mintDetail.decimals || 8,
					),
					token.poolAddress,
					token.tokenAddress.split("::").length !== 3,
				);

			return JSON.stringify({
				status: "success",
				withdrawTokenTransactionHash,
				token: {
					name: mintDetail.name,
					decimals: mintDetail.decimals,
				},
			});
		} catch (error: any) {
			return JSON.stringify({
				status: "error",
				message: error.message,
				code: error.code || "UNKNOWN_ERROR",
			});
		}
	}
}
