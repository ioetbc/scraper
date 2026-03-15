export type ClassificationInput = {
  caption: string;
  mentions: string[];
  hashtags: string[];
  isAd: boolean;
  isSponsored: boolean;
}

export type ClassificationResult = {
  isPromotion: boolean;
  brand: string | null;
  confidence: number;
  signals: string[];
  tier: 1 | 2;
}

export class ClassifierError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ClassifierError';
  }
}
