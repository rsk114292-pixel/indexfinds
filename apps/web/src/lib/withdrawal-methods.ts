const SUPPORTED_WITHDRAWAL_METHOD_LABELS = {
  paypal: 'PayPal',
  crypto: 'Crypto',
} as const;

export function getWithdrawalMethodLabel(
  method: string,
  legacyLabel = 'Legacy method',
): string {
  return SUPPORTED_WITHDRAWAL_METHOD_LABELS[
    method as keyof typeof SUPPORTED_WITHDRAWAL_METHOD_LABELS
  ] ?? legacyLabel;
}
