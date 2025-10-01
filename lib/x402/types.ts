export interface X402PaymentPayload {
  scheme: string;
  proof: string;
  amount: string;
  currency: string;
  timestamp: number;
}

export interface PaymentRequirement {
  scheme: string;
  amount: string;
  currency: string;
  network: string;
  recipient: string;
  metadata: {
    service: string;
    version: string;
  };
}
