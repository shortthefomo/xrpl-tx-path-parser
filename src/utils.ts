// @ts-ignore
import { extractExchanges } from '@xrplkit/txmeta'
import {
  type Amount,
  type Balance,
  type Currency,
  type ModifiedNode,
  type Payment,
  type TransactionMetadata,
  type TxResponse,
  dropsToXrp,
  getBalanceChanges,
  isModifiedNode,
} from 'xrpl'
import type { RippleState } from 'xrpl/dist/npm/models/ledger'
import type { PaymentMetadata } from 'xrpl/dist/npm/models/transactions/payment'

export type Response = {
  sourceAccount: string
  destinationAccount: string
  sourceAmount: Balance
  destinationAmount: Balance
  paths: {
    from: Balance
    to: Balance
    type: {
      offer: boolean
      amm: boolean
      rippling: boolean
    }
  }[][]
}

const lsfAMMNode = 0x01000000

export const equalCurrency = (a: Balance | Currency, b: Balance | Currency) =>
  a.issuer === b.issuer && a.currency === b.currency

export const getOfferChangesAmount = (tx: TxResponse['result']) => {
  return extractExchanges(tx, { collapse: true }) as Record<'takerPaid' | 'takerGot', Balance>[]
}

export const getAmmAccounts = (meta: PaymentMetadata): string[] => {
  const modifiedAMMNodes = meta.AffectedNodes.filter(
    (node) =>
      isModifiedNode(node) &&
      node.ModifiedNode.LedgerEntryType === 'RippleState' &&
      lsfAMMNode & (node.ModifiedNode.FinalFields?.Flags as number),
  ) as ModifiedNode[]

  const modifiedAmmAccount = modifiedAMMNodes.map((node) => {
    const finalFields = node.ModifiedNode.FinalFields as unknown as RippleState
    return finalFields.Balance.value.startsWith('-') ? finalFields.HighLimit.issuer : finalFields.LowLimit.issuer
  })

  const unique = modifiedAmmAccount.filter((elem, index, self) => self.indexOf(elem) === index)

  return unique
}

export const getAccountBalanceChanges = (meta: TransactionMetadata) => {
  const ammAccounts = getAmmAccounts(meta)
  return getBalanceChanges(meta).map((change) => {
    return {
      ...change,
      isAMM: ammAccounts.includes(change.account),
    }
  })
}

export const amountToBalance = (amount: Amount): Balance => {
  if (typeof amount === 'string') {
    return {
      currency: 'XRP',
      value: dropsToXrp(amount).toString(),
    }
  }
  return amount
}
