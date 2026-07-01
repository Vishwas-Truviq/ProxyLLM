export type Recommendation = {
  id: number | string;
  score: number;
  jurisdiction: string;
  entityName: string;
  categories?: string[];
  idealFor?: string[];
  setupCost?: string;
  annualCost?: string;
  desc?: string;
  setupTime?: string;
  benefit1?: string;
  benefit2?: string;
  benefit3?: string;
  legalFramework?: string;
  liabilityProtection?: string;
  publicRegister?: string;
  fees?: {
    setupFee?: string;
    corporateDirectorFee?: string;
    registeredOfficeFee?: string;
    corporateSecretaryFee?: string;
    governmentFee?: string;
    annualFeeTotal?: string;
  };
};

export type RecommendResponse = {
  results: Recommendation[];
  noMatch?: boolean;
};
