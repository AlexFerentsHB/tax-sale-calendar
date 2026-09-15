export type Program = {
  id: number;
  name: string;
  slug: string;
};

export type StateEntry = {
  id: number;
  name: string;
  slug: string;
  code: string | null;
  programId: number | null;
  sourceUrl: string;
};

export type CountyEntry = {
  id: number;
  name: string;
  slug: string;
  stateId: number;
  code: string | null;
  programId: number | null;
  sourceUrl: string;
  upcomingCount: number;
  hasDetail: boolean;
};

export type Manifest = {
  generatedAt: string;
  version: string;
  programs: Program[];
  states: StateEntry[];
  counties: CountyEntry[];
  eventMonths: string[];
  counts: { counties: number; events: number; states: number };
};

export type CountyFacts = {
  taxSaleType?: string;
  typicalSaleDate?: string;
  redemptionPeriod?: string;
  interestRate?: string;
  bidProcedure?: string;
  deposit?: string;
  registration?: string;
  auctionLocation?: string;
  contact?: string;
  updates?: string;
  extra?: { label: string; value: string }[];
};

export type CountyDetail = {
  id: number;
  name: string;
  slug: string;
  state: string | null;
  code: string | null;
  program: string | null;
  sourceUrl: string;
  lastUpdated: string | null;
  facts: CountyFacts | null;
  bodyHtml: string;
  upcomingCount: number;
};

export type AuctionEvent = {
  id: number;
  title: string;
  url: string;
  startDate: string | null;
  endDate: string | null;
  timezone: string | null;
  county: string | null;
  code: string | null;
  state: string | null;
  type: string | null;
  countyId: number | null;
  venue: { name: string; city: string; state: string } | null;
  blurb: string;
};

export type EventMonth = { month: string; events: AuctionEvent[] };