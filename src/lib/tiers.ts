/**
 * Listing tiers and pricing. Prices are in Rands per month; annual billing
 * gives two months free. Edit here — everything else reads from this table.
 *
 * Tiers gate profile richness and placement, never findability: every listed
 * professional stays searchable, money buys depth and prominence.
 */

export type TierSlug = "basic" | "standard" | "silver" | "gold" | "elite";

export type Tier = {
  slug: TierSlug;
  name: string;
  monthlyRands: number;
  blurb: string;
  features: string[];
  /** Marketing highlight in pricing UI */
  highlight?: boolean;
  /** Elite is deliberately scarce */
  scarce?: boolean;
  /**
   * Sold as a fixed 12-month seat: annual billing only, single charge per
   * term (no silent auto-renewal). Renewal is a fresh purchase at the
   * then-current price, so seats stay contestable when demand grows.
   */
  annualOnly?: boolean;
};

export const TIERS: Tier[] = [
  {
    slug: "basic",
    name: "Basic",
    monthlyRands: 195,
    blurb: "Own your listing.",
    features: [
      "Claim and edit your profile",
      "Photo, contact details and location",
      "Up to 3 practice areas",
      "Short professional summary",
    ],
  },
  {
    slug: "standard",
    name: "Standard",
    monthlyRands: 395,
    blurb: "Tell your full story.",
    features: [
      "Everything in Basic",
      "Full About and Qualifications sections",
      "Services list and up to 8 practice areas",
      "Website and LinkedIn links",
      "Client enquiries to your inbox",
    ],
  },
  {
    slug: "silver",
    name: "Silver",
    monthlyRands: 695,
    blurb: "Show the depth of your practice.",
    highlight: true,
    features: [
      "Everything in Standard",
      "Accolades and noteworthy matters",
      "Reported cases on your profile",
      "Multiple offices / branches",
      "Placement above Basic and Standard listings",
    ],
  },
  {
    slug: "gold",
    name: "Gold",
    monthlyRands: 1250,
    blurb: "Stand out in your practice area.",
    features: [
      "Everything in Silver",
      "Enhanced profile card in results",
      "Featured rotation on practice-area pages",
      "Top placement band in search results",
      "Profile performance reporting",
    ],
  },
  {
    slug: "elite",
    name: "Elite",
    monthlyRands: 2450,
    blurb: "Limited seats per practice area and province.",
    scarce: true,
    annualOnly: true,
    features: [
      "Everything in Gold",
      "Guaranteed featured slot in your practice area",
      "Homepage featured rotation",
      "First-position placement band",
      "12-month seat — renewal priced by demand, waitlist when full",
    ],
  },
];

export const TIER_BY_SLUG: Record<TierSlug, Tier> = Object.fromEntries(
  TIERS.map((t) => [t.slug, t]),
) as Record<TierSlug, Tier>;

/** Annual price: 12 months for the price of 10. */
export function annualRands(tier: Tier): number {
  return tier.monthlyRands * 10;
}

export function formatRands(amount: number): string {
  return `R${amount.toLocaleString("en-ZA")}`;
}
