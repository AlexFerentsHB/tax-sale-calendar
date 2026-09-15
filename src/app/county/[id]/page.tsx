import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { CountyView } from "@/components/county-view";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  let counties: { id: number }[] = [];
  try {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/data/manifest.json"), "utf8"));
    counties = manifest.counties ?? [];
  } catch {
    counties = [];
  }
  return counties.map((c) => ({ id: String(c.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `County ${id} — Tax Sale.` };
}

export default async function CountyPage({ params }: Props) {
  const { id } = await params;
  return <CountyView id={Number(id)} />;
}